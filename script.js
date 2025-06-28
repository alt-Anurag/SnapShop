document.addEventListener("DOMContentLoaded", function () {
  let cachedRecommendations = null;
  let cachedBase64Image = null;

  const uploadContainer = document.getElementById("upload-container");
  const fileInput = document.getElementById("file-input");
  const browseBtn = document.getElementById("browse-btn");
  const previewSection = document.getElementById("preview-section");
  const previewImage = document.getElementById("preview-image");
  const detectedItems = document.getElementById("detected-items");
  const findProductsBtn = document.getElementById("find-products-btn");
  const resultsSection = document.getElementById("results-section");
  const recommendationsSection = document.getElementById("recommendations-section");

  const API_ENDPOINT = "/.netlify/functions/describe-image";
  const RECOMMENDATIONS_ENDPOINT = "/.netlify/functions/recommend-products";

  browseBtn.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", (e) => {
    if (e.target.files.length) {
      handleImageUpload(e.target.files[0]);
    }
  });

  async function handleImageUpload(file) {
    if (!file.type.match("image.*")) {
      alert("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onload = async function (e) {
      previewImage.src = e.target.result;
      showPreview();
      const base64Image = e.target.result.split(",")[1];
      cachedBase64Image = base64Image;

      detectedItems.innerHTML = `
        <div class="space-y-3 text-center py-4">
          <div class="animate-pulse flex flex-col items-center">
            <i class="fas fa-spinner fa-spin text-2xl text-teal mb-2"></i>
            <p class="text-teal font-medium">Analyzing image...</p>
            <p class="text-teal-light">Please wait while we process your image</p>
          </div>
        </div>
      `;

      fetchRecommendationsWithRetries(base64Image);

      try {
        const description = await getImageDescription(base64Image);
        displayDescription(description);
      } catch (error) {
        console.error("Error:", error);
        detectedItems.innerHTML = `
          <div class="text-red-500 text-center py-4">
            <i class="fas fa-exclamation-circle mr-2"></i>
            Failed to analyze image. Please try again.
          </div>
        `;
      }
    };
    reader.readAsDataURL(file);
  }

  async function fetchRecommendationsWithRetries(base64Image, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(RECOMMENDATIONS_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: `data:image/jpeg;base64,${base64Image}` }),
        });

        if (!response.ok) throw new Error(`Attempt ${attempt} failed`);

        const result = await response.json();
        if (result.products && result.products.length > 0) {
          cachedRecommendations = result.products;
          return;
        }
      } catch (err) {
        console.warn(`Recommendation fetch failed (attempt ${attempt})`, err);
        if (attempt === retries) cachedRecommendations = null;
        await new Promise((res) => setTimeout(res, 2000));
      }
    }
  }

  findProductsBtn.addEventListener("click", async () => {
    findProductsBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Searching...';
    findProductsBtn.disabled = true;
    try {
      await new Promise((res) => setTimeout(res, 4000));
      await showResults();
      await showRecommendations();
      resultsSection.scrollIntoView({ behavior: "smooth" });
    } catch (error) {
      console.error("Error finding products:", error);
    } finally {
      findProductsBtn.innerHTML = '<i class="fas fa-search mr-2"></i>Find Matching Products';
      findProductsBtn.disabled = false;
    }
  });

  async function getImageDescription(base64Image) {
    const response = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: base64Image }),
    });
    if (!response.ok) throw new Error(`API request failed with status ${response.status}`);
    const data = await response.json();
    return data.description || "No description available";
  }

  function displayDescription(description) {
    const descriptionPoints = description.split("\n").filter((point) => point.trim() !== "");
    let descriptionHTML = '<div class="space-y-3">';
    descriptionPoints.forEach((point) => {
      descriptionHTML += `
        <div class="flex items-center">
          <div class="w-3 h-3 rounded-full bg-teal mr-2 flex-shrink-0"></div>
          <span class="font-medium text-indigo-dark">${point}</span>
        </div>
      `;
    });
    descriptionHTML += "</div>";
    detectedItems.innerHTML = descriptionHTML;
  }

  function showPreview() {
    uploadContainer.classList.add("hidden");
    previewSection.classList.remove("hidden");
    previewSection.classList.add("fade-in");
  }

  async function showResults() {
    const resultsContainer = resultsSection.querySelector(".grid");
    resultsContainer.innerHTML = `
      <div class="col-span-full text-center py-8">
        <div class="animate-pulse flex flex-col items-center">
          <i class="fas fa-spinner fa-spin text-2xl text-teal mb-2"></i>
          <p class="text-teal font-medium">Finding matching products...</p>
        </div>
      </div>
    `;
    resultsSection.classList.remove("hidden");

    if (!cachedRecommendations) {
      resultsContainer.innerHTML = `
        <div class="col-span-full text-center py-8">
          <i class="fas fa-exclamation-circle text-2xl text-teal mb-2"></i>
          <p class="text-teal font-medium">No matching products found</p>
          <p class="text-teal-light">Try uploading a different image</p>
        </div>
      `;
      return;
    }

    resultsContainer.innerHTML = "";
    cachedRecommendations.slice(0, 3).forEach((product) => {
      const productCard = document.createElement("div");
      productCard.className = "product-card bg-white rounded-xl overflow-hidden fade-in";
      productCard.innerHTML = `
        <img src="${product.Image || "https://via.placeholder.com/300x300"}"
             alt="${product.Product || "Product"}"
             class="w-full h-60 object-cover"
             onerror="this.src='https://via.placeholder.com/300x300'">
        <div class="p-4">
          <h3 class="font-medium text-indigo-dark mb-1">${product.Product || "Product"}</h3>
          <p class="text-teal font-semibold mb-3">₹${product.Price || "N/A"}</p>
          <a href="${product.URL || "#"}" target="_blank"
             class="block w-full bg-indigo-dark text-white py-2 rounded-lg hover:bg-indigo-darker transition duration-300 flex items-center justify-center">
            <i class="fas fa-shopping-cart mr-2"></i>View Product
          </a>
        </div>
      `;
      resultsContainer.appendChild(productCard);
    });
  }

  async function showRecommendations() {
    const recommendationsContainer = recommendationsSection.querySelector(".grid");
    recommendationsContainer.innerHTML = `
      <div class="col-span-full text-center py-8">
        <div class="animate-pulse flex flex-col items-center">
          <i class="fas fa-spinner fa-spin text-2xl text-teal mb-2"></i>
          <p class="text-teal font-medium">Finding style recommendations...</p>
        </div>
      </div>
    `;
    recommendationsSection.classList.remove("hidden");

    if (!cachedRecommendations) {
      recommendationsContainer.innerHTML = `
        <div class="col-span-full text-center py-8">
          <i class="fas fa-exclamation-circle text-2xl text-teal mb-2"></i>
          <p class="text-teal font-medium">No recommendations found</p>
          <p class="text-teal-light">Try uploading a different image</p>
        </div>
      `;
      return;
    }

    recommendationsContainer.innerHTML = "";
    cachedRecommendations.forEach((product) => {
      const card = document.createElement("div");
      card.className = "product-card bg-white rounded-xl overflow-hidden fade-in";
      card.innerHTML = `
        <img src="${product.Image || "https://via.placeholder.com/300x300"}"
             alt="${product.Product}" 
             class="w-full h-48 object-cover"
             onerror="this.src='https://via.placeholder.com/300x300'">
        <div class="p-4">
          <h3 class="font-medium text-indigo-dark mb-1">${product.Product || "Product"}</h3>
          <p class="text-teal font-semibold mb-3">₹${product.Price || "N/A"}</p>
          <a href="${product.URL || "#"}" target="_blank"
             class="block w-full bg-green text-white py-2 rounded-lg hover:bg-green-light transition duration-300 flex items-center justify-center"
             style="background-color: var(--green);">
            <i class="fas fa-link mr-2"></i>Click to Buy
          </a>
        </div>
      `;
      recommendationsContainer.appendChild(card);
    });
  }
});
