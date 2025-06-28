document.addEventListener("DOMContentLoaded", function () {
  // Mobile menu toggle - improved version
  const mobileMenuButton = document.querySelector(".mobile-menu-button");
  const mobileMenu = document.querySelector(".mobile-menu");

  mobileMenuButton.addEventListener("click", function () {
    mobileMenu.classList.toggle("hidden");
    // Toggle aria-expanded for accessibility
    const isExpanded = this.getAttribute("aria-expanded") === "true";
    this.setAttribute("aria-expanded", !isExpanded);
  });

  // Close mobile menu when clicking outside
  document.addEventListener("click", function (e) {
    if (
      !mobileMenu.contains(e.target) &&
      !mobileMenuButton.contains(e.target)
    ) {
      mobileMenu.classList.add("hidden");
      mobileMenuButton.setAttribute("aria-expanded", "false");
    }
  });

  // Mobile viewport height correction
  function adjustViewport() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty("--vh", `${vh}px`);
  }

  // Fix for initial mobile load
  window.addEventListener("load", () => {
    if (window.innerWidth < 768) {
      setTimeout(() => {
        document.querySelector(".hero-section")?.scrollIntoView(true);
      }, 100);
    }
  });

  // Run on load and resize
  window.addEventListener("load", adjustViewport);
  window.addEventListener("resize", adjustViewport);
  adjustViewport();

  // File upload functionality
  const uploadContainer = document.getElementById("upload-container");
  const fileInput = document.getElementById("file-input");
  const browseBtn = document.getElementById("browse-btn");
  const cameraBtn = document.getElementById("camera-btn");
  const sampleBtn = document.getElementById("sample-btn");
  const previewSection = document.getElementById("preview-section");
  const previewImage = document.getElementById("preview-image");
  const detectedItems = document.getElementById("detected-items");
  const findProductsBtn = document.getElementById("find-products-btn");
  const resultsSection = document.getElementById("results-section");
  const recommendationsSection = document.getElementById(
    "recommendations-section"
  );

  // API Configuration
  const API_ENDPOINT = "/.netlify/functions/describe-image";
  const RECOMMENDATIONS_ENDPOINT = "/.netlify/functions/recommend-products";

  // ✅ Global variables for background preloading
  let preloadedRecommendations = null;
  let preloadingInProgress = false;
  let currentImageBase64 = null;

  // Handle drag and drop
  uploadContainer.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadContainer.classList.add("border-teal", "bg-teal-light");
  });

  uploadContainer.addEventListener("dragleave", () => {
    uploadContainer.classList.remove("border-teal", "bg-teal-light");
  });

  uploadContainer.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadContainer.classList.remove("border-teal", "bg-teal-light");

    if (e.dataTransfer.files.length) {
      handleImageUpload(e.dataTransfer.files[0]);
    }
  });

  // Handle file selection
  browseBtn.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", (e) => {
    if (e.target.files.length) {
      handleImageUpload(e.target.files[0]);
    }
  });

  // Universal mobile layout enforcer
  function enforceMobileLayout() {
    if (window.innerWidth < 768) {
      // Calculate required spacing
      const navbarHeight = document.querySelector(".glass-navbar").offsetHeight;
      document.querySelector(
        ".hero-section"
      ).style.paddingTop = `${navbarHeight}px`;
    }
  }

  // Run on load and resize
  window.addEventListener("load", enforceMobileLayout);
  window.addEventListener("resize", enforceMobileLayout);

  // ✅ REVERTED: Original camera button implementation from backup
  cameraBtn.addEventListener("click", () => {
    // Set the file input to accept images and use camera
    fileInput.setAttribute("capture", "environment");
    fileInput.setAttribute("accept", "image/*");
    fileInput.click();
  });

  // Sample button
  sampleBtn.addEventListener("click", async () => {
    // Use a sample image for demo
    previewImage.src =
      "https://images.unsplash.com/photo-1490114538077-0a7f8cb49891?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80";
    showPreview();

    // Show loading state
    detectedItems.innerHTML = `
            <div class="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg">
                <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <div>
                    <p class="font-medium text-blue-900">Analyzing sample image...</p>
                    <p class="text-sm text-blue-600">Please wait while we process the image</p>
                </div>
            </div>
        `;

    try {
      // Fetch the sample image
      const response = await fetch(previewImage.src);
      const blob = await response.blob();
      const reader = new FileReader();

      reader.onload = async function () {
        const base64Image = reader.result.split(",")[1];
        currentImageBase64 = base64Image; // ✅ Store for background preloading

        // ✅ Start background preloading immediately
        startBackgroundPreloading(base64Image);

        const description = await getImageDescription(base64Image);
        displayDescription(description);
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error("Error with sample image:", error);
      detectedItems.innerHTML = `
                <div class="p-4 bg-red-50 rounded-lg">
                    <p class="text-red-600">Failed to analyze sample image. Please try again.</p>
                </div>
            `;
    }
  });

  // ✅ Background preloading function
  async function startBackgroundPreloading(base64Image) {
    if (preloadingInProgress) return;

    preloadingInProgress = true;
    console.log("🚀 Starting background preloading...");

    try {
      const response = await fetch(RECOMMENDATIONS_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageBase64: `data:image/jpeg;base64,${base64Image}`,
        }),
      });

      if (response.ok) {
        preloadedRecommendations = await response.json();
        console.log("✅ Background preloading completed successfully!");
      } else {
        console.log("⚠️ Background preloading failed, will retry on demand");
        preloadedRecommendations = null;
      }
    } catch (error) {
      console.log("⚠️ Background preloading error:", error.message);
      preloadedRecommendations = null;
    } finally {
      preloadingInProgress = false;
    }
  }

  // ✅ UPDATED: Find products button - Only shows Recommended Products section
  findProductsBtn.addEventListener("click", async () => {
    findProductsBtn.innerHTML = "🔍 Searching...";
    findProductsBtn.disabled = true;

    try {
      // ✅ Show immediate results if preloaded, otherwise show 7-second loader
      if (preloadedRecommendations && preloadedRecommendations.products) {
        console.log("⚡ Using preloaded recommendations!");
        await showPreloadedResults();
      } else {
        console.log("⏳ No preloaded data, showing 7-second loader...");
        await showResultsWithLoader();
      }

      // Smooth scroll to recommendations section only
      recommendationsSection.scrollIntoView({ behavior: "smooth" });
    } catch (error) {
      console.error("Error finding products:", error);
      // Show error to user
      const recommendationsContainer =
        recommendationsSection.querySelector(".grid");
      recommendationsContainer.innerHTML = `
                <div class="col-span-full text-center py-8">
                    <p class="text-gray-600 mb-2">Failed to load products</p>
                    <p class="text-sm text-gray-500">Please try again later</p>
                </div>
            `;
      recommendationsSection.classList.remove("hidden");
    } finally {
      findProductsBtn.innerHTML = "Find Matching Products";
      findProductsBtn.disabled = false;
    }
  });

  // ✅ UPDATED: Show preloaded results - Only Recommended Products section
  async function showPreloadedResults() {
    const recommendationsContainer =
      recommendationsSection.querySelector(".grid");

    // Show only recommendations section immediately with preloaded data
    recommendationsSection.classList.remove("hidden");

    const products = preloadedRecommendations.products || [];

    // Populate "Recommended Products" section only
    if (products.length > 0) {
      recommendationsContainer.innerHTML = "";
      products.forEach((product) => {
        const recommendationCard = createProductCard(product);
        recommendationsContainer.appendChild(recommendationCard);
      });
    } else {
      recommendationsContainer.innerHTML = `
                <div class="col-span-full text-center py-8">
                    <p class="text-gray-600 mb-2">No recommendations found</p>
                    <p class="text-sm text-gray-500">Try uploading a different image</p>
                </div>
            `;
    }
  }

  // ✅ UPDATED: Show results with 7-second loader - Only Recommended Products section
  async function showResultsWithLoader() {
    const recommendationsContainer =
      recommendationsSection.querySelector(".grid");

    // Show loading state for recommendations section only
    recommendationsContainer.innerHTML = `
            <div class="col-span-full flex items-center justify-center py-12">
                <div class="text-center">
                    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-teal mx-auto mb-4"></div>
                    <p class="text-gray-600">Finding style recommendations...</p>
                </div>
            </div>
        `;

    recommendationsSection.classList.remove("hidden");

    // ✅ 7-second delay simulation while making actual API call
    const [_, actualResults] = await Promise.all([
      new Promise((resolve) => setTimeout(resolve, 7000)), // 7-second delay
      fetchRecommendationsFromAPI(), // Actual API call
    ]);

    // Show real results after delay
    if (
      actualResults &&
      actualResults.products &&
      actualResults.products.length > 0
    ) {
      // Populate "Recommended Products" section only
      recommendationsContainer.innerHTML = "";
      actualResults.products.forEach((product) => {
        const recommendationCard = createProductCard(product);
        recommendationsContainer.appendChild(recommendationCard);
      });
    } else {
      // Show no results message
      recommendationsContainer.innerHTML = `
                <div class="col-span-full text-center py-8">
                    <p class="text-gray-600 mb-2">No matching products found</p>
                    <p class="text-sm text-gray-500">Try uploading a different image</p>
                </div>
            `;
    }
  }

  // ✅ Fetch recommendations from API
  async function fetchRecommendationsFromAPI() {
    try {
      const response = await fetch(RECOMMENDATIONS_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageBase64: `data:image/jpeg;base64,${currentImageBase64}`,
        }),
      });

      if (response.ok) {
        return await response.json();
      } else {
        throw new Error(`API request failed with status ${response.status}`);
      }
    } catch (error) {
      console.error("API fetch error:", error);
      return null;
    }
  }

  // ✅ Create product card helper function
  function createProductCard(product) {
    const productCard = document.createElement("div");
    productCard.className = "product-card bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 fade-in";

    // Handle product URL properly
    let productUrl = "#";
    if (product.URL) {
        try {
            // If it's already a full URL, use it as is
            productUrl = new URL(product.URL).href;
        } catch (e) {
            // If it's not a full URL, try to make it one
            if (product.URL.startsWith("www.")) {
                productUrl = `https://${product.URL}`;
            } else if (product.URL.startsWith("http")) {
                productUrl = product.URL;
            } else {
                productUrl = `https://${product.URL}`;
            }
        }
    }

    productCard.innerHTML = `
        <div class="aspect-square bg-gray-100 flex items-center justify-center overflow-hidden">
            <img src="${product.Image || '/api/placeholder/300/300'}" 
                 alt="${product.Product || 'Product'}" 
                 class="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                 onerror="this.src='/api/placeholder/300/300'">
        </div>
        <div class="p-4">
            <h3 class="font-semibold text-gray-900 mb-2 line-clamp-2">${product.Product || "Product"}</h3>
            <p class="text-xl font-bold text-teal mb-3">₹${product.Price || "N/A"}</p>
            <a href="${productUrl}" target="_blank" 
               class="block w-full bg-gradient-to-r from-teal to-teal-dark text-white text-center py-3 px-4 rounded-lg font-medium hover:from-teal-dark hover:to-teal transform hover:scale-105 transition-all duration-200 shadow-md hover:shadow-lg">
                🛒 Click to Buy
            </a>
        </div>
    `;
    return productCard;
}


    productCard.innerHTML = `
            <div class="aspect-square bg-gray-100 flex items-center justify-center overflow-hidden">
                <img src="${product.Image || "/api/placeholder/300/300"}" 
                     alt="${product.Product || "Product"}" 
                     class="w-full h-full object-cover"
                     onerror="this.src='/api/placeholder/300/300'">
            </div>
            <div class="p-4">
                <h3 class="font-semibold text-gray-900 mb-2 line-clamp-2">${
                  product.Product || "Product"
                }</h3>
                <p class="text-xl font-bold text-teal mb-3">₹${
                  product.Price || "N/A"
                }</p>
                <a href="${productUrl}" target="_blank" 
                   class="block w-full bg-teal text-white text-center py-2 rounded-lg hover:bg-teal-dark transition-colors">
                    View Product
                </a>
            </div>
        `;
    return productCard;
  }

  // ✅ Handle image upload with background preloading
  async function handleImageUpload(file) {
    if (!file.type.match("image.*")) {
      alert("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onload = async function (e) {
      previewImage.src = e.target.result;
      showPreview();

      // Show loading state
      detectedItems.innerHTML = `
                <div class="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg">
                    <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <div>
                        <p class="font-medium text-blue-900">Analyzing image...</p>
                        <p class="text-sm text-blue-600">Please wait while we process your image</p>
                    </div>
                </div>
            `;

      try {
        // Convert image to base64
        const base64Image = e.target.result.split(",")[1];
        currentImageBase64 = base64Image; // ✅ Store for background preloading

        // ✅ Start background preloading immediately
        startBackgroundPreloading(base64Image);

        // Call the API for description
        const description = await getImageDescription(base64Image);

        // Display the description
        displayDescription(description);
      } catch (error) {
        console.error("Error:", error);
        detectedItems.innerHTML = `
                    <div class="p-4 bg-red-50 rounded-lg">
                        <p class="text-red-600">Failed to analyze image. Please try again.</p>
                    </div>
                `;
      }
    };
    reader.readAsDataURL(file);
  }

  // Get image description from API
  async function getImageDescription(base64Image) {
    try {
      // First update to "Describing image..."
      detectedItems.innerHTML = `
                <div class="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg">
                    <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <div>
                        <p class="font-medium text-blue-900">Describing image...</p>
                        <p class="text-sm text-blue-600">Almost done!</p>
                    </div>
                </div>
            `;

      const response = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image: base64Image }),
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();
      return data.description || "No description available";
    } catch (error) {
      console.error("API Error:", error);
      throw error;
    }
  }

  // Display the description with improved formatting
  function displayDescription(description) {
    // Split the description into bullet points if it contains newlines
    const descriptionPoints = description
      .split("\n")
      .filter((point) => point.trim() !== "");

    // Create HTML for the description
    let descriptionHTML = '<div class="space-y-2">';

    descriptionPoints.forEach((point) => {
      descriptionHTML += `
                <div class="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div class="w-2 h-2 bg-teal rounded-full mt-2 flex-shrink-0"></div>
                    <p class="text-gray-700">${point}</p>
                </div>
            `;
    });

    descriptionHTML += "</div>";

    detectedItems.innerHTML = descriptionHTML;
  }

  // Show preview section
  function showPreview() {
    uploadContainer.classList.add("hidden");
    previewSection.classList.remove("hidden");
    previewSection.classList.add("fade-in");
  }

  // Glass navbar effects - FIXED TO SHOW IMMEDIATELY
  const navbar = document.querySelector(".glass-navbar");

  // Apply glass effect immediately
  navbar.style.backdropFilter = "blur(12px) saturate(160%)";
  navbar.style.backgroundColor = "rgba(255, 255, 255, 0.25)";
  navbar.style.webkitBackdropFilter = "blur(12px) saturate(160%)";

  // Dynamic light follow (mouse tracking)
  document.addEventListener("mousemove", (e) => {
    const x = e.clientX / window.innerWidth;
    const y = e.clientY / window.innerHeight;
    navbar.style.setProperty("--mouse-x", x);
    navbar.style.setProperty("--mouse-y", y);
  });

  let lastScrollY = window.scrollY;

  window.addEventListener("scroll", () => {
    // Blur intensity increases with scroll
    const scrollBlur = Math.min(12 + window.scrollY / 20, 20);

    // Background opacity decreases slightly when scrolling down
    const opacityDirection = window.scrollY > lastScrollY ? 0.2 : 0.25;
    const scrollOpacity = Math.max(
      0.15,
      opacityDirection - window.scrollY / 1000
    );

    navbar.style.backdropFilter = `blur(${scrollBlur}px) saturate(160%)`;
    navbar.style.backgroundColor = `rgba(255, 255, 255, ${scrollOpacity})`;

    lastScrollY = window.scrollY;
  });
});
