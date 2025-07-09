document.addEventListener("DOMContentLoaded", function () {
  const mobileMenuButton = document.querySelector(".mobile-menu-button");
  const mobileMenu = document.querySelector(".mobile-menu");

  mobileMenuButton.addEventListener("click", function (e) {
    e.stopPropagation();
    mobileMenu.classList.toggle("hidden");
    mobileMenu.classList.toggle("active");

    document.body.style.overflow = mobileMenu.classList.contains("active")
      ? "hidden"
      : "";

    const isExpanded = mobileMenu.classList.contains("active");
    this.setAttribute("aria-expanded", isExpanded);
    mobileMenu.setAttribute("aria-hidden", !isExpanded);
  });

  document.addEventListener("click", function (e) {
    if (
      !mobileMenu.contains(e.target) &&
      !mobileMenuButton.contains(e.target)
    ) {
      mobileMenu.classList.add("hidden");
      mobileMenu.classList.remove("active");
      mobileMenuButton.setAttribute("aria-expanded", "false");
      mobileMenu.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    }
  });

  mobileMenu.addEventListener("click", function (e) {
    e.stopPropagation();
  });

  document.querySelectorAll(".mobile-menu a").forEach((item) => {
    item.addEventListener("click", () => {
      mobileMenu.classList.add("hidden");
      mobileMenu.classList.remove("active");
      mobileMenuButton.setAttribute("aria-expanded", "false");
      mobileMenu.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    });
  });

  function adjustViewport() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty("--vh", `${vh}px`);
  }

  window.addEventListener("load", () => {
    if (window.innerWidth < 768) {
      setTimeout(() => {
        document.querySelector(".hero-section")?.scrollIntoView(true);
      }, 100);
    }
  });

  window.addEventListener("load", adjustViewport);
  window.addEventListener("resize", adjustViewport);
  adjustViewport();

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

  const API_ENDPOINT = "/.netlify/functions/describe-image";
  const RECOMMENDATIONS_ENDPOINT = "/.netlify/functions/recommend-products";

  let preloadedRecommendations = null;
  let preloadingInProgress = false;
  let currentImageBase64 = null;

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

  browseBtn.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", (e) => {
    if (e.target.files.length) {
      handleImageUpload(e.target.files[0]);
    }
  });

  function enforceMobileLayout() {
    if (window.innerWidth < 768) {
      const navbarHeight = document.querySelector(".glass-navbar").offsetHeight;
      document.querySelector(
        ".hero-section"
      ).style.paddingTop = `${navbarHeight}px`;
    }
  }

  window.addEventListener("load", enforceMobileLayout);
  window.addEventListener("resize", enforceMobileLayout);

  cameraBtn.addEventListener("click", () => {
    fileInput.setAttribute("capture", "environment");
    fileInput.setAttribute("accept", "image/*");
    fileInput.click();
  });

  sampleBtn.addEventListener("click", async () => {
    previewImage.src =
      "https://jsnbscsxsqrrdgllgttw.supabase.co/storage/v1/object/public/uploads//sample.jpg";
    showPreview();

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
        currentImageBase64 = base64Image;

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

  findProductsBtn.addEventListener("click", async () => {
    findProductsBtn.innerHTML = "🔍 Searching...";
    findProductsBtn.disabled = true;

    try {
      if (preloadedRecommendations && preloadedRecommendations.products) {
        console.log("⚡ Using preloaded recommendations!");
        await showPreloadedResults();
      } else {
        console.log("⏳ No preloaded data, showing 7-second loader...");
        await showResultsWithLoader();
      }

      recommendationsSection.scrollIntoView({ behavior: "smooth" });
    } catch (error) {
      console.error("Error finding products:", error);

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

  async function showPreloadedResults() {
    const recommendationsContainer =
      recommendationsSection.querySelector(".grid");

    recommendationsSection.classList.remove("hidden");

    const products = preloadedRecommendations.products || [];

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

  async function showResultsWithLoader() {
    const recommendationsContainer =
      recommendationsSection.querySelector(".grid");

    const phrases = [
      "Curating your perfect picks...",
      "Finding your kinda vibe...",
      "Brewing up Recommendations...",
      "Lining up stuff for you...",
    ];
    const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
    recommendationsContainer.innerHTML = `
            <div class="col-span-full flex items-center justify-center py-12">
                <div class="text-center">
                    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-teal mx-auto mb-4"></div>
                    <p class="text-gray-600">${randomPhrase}</p>
                </div>
            </div>
        `;

    recommendationsSection.classList.remove("hidden");

    const [_, actualResults] = await Promise.all([
      new Promise((resolve) => setTimeout(resolve, 100)),
      fetchRecommendationsFromAPI(),
    ]);

    if (
      actualResults &&
      actualResults.products &&
      actualResults.products.length > 0
    ) {
      recommendationsContainer.innerHTML = "";
      actualResults.products.forEach((product) => {
        const recommendationCard = createProductCard(product);
        recommendationsContainer.appendChild(recommendationCard);
      });
    } else {
      recommendationsContainer.innerHTML = `
                <div class="col-span-full text-center py-8">
                    <p class="text-gray-600 mb-2">No matching products found</p>
                    <p class="text-sm text-gray-500 mb-1">Try clicking "Find Matching Products" again.</p>
                    <div class="text-sm text-gray-400 mt-4 space-y-1">
                      <p class="font-medium">If the issue keeps popping up, it might be because:</p>
                      <ul class="list-disc list-inside text-left inline-block text-gray-400">
                        <li>Try doing a hard refresh on this webpage.</li>
                        <li>The backend needs a moment to warm up (free-tier cold start issues— student struggles 😅).</li>
                        <li>The product database on the backend is still growing, and some items might not be listed yet due to free-tier data limits.</li>
                      </ul>
                      <p class="italic mt-2">I'm constantly working on improving this — thanks for your patience!</p>
                    </div>
                </div>
            `;
    }
  }

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

  function createProductCard(product) {
    const productCard = document.createElement("div");

    productCard.className =
      "product-card bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 fade-in";

    let productUrl = "#";
    if (product.URL) {
      try {
        productUrl = new URL(product.URL).href;
      } catch (e) {
        // More robust URL handling
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
            <img src="${product.Image || "/api/placeholder/300/300"}" 
                 alt="${product.Product || "Product"}" 
                 class="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                 onerror="this.src='/api/placeholder/300/300'">
        </div>
        <div class="p-4">
            <h3 class="font-semibold text-gray-900 mb-2 line-clamp-2">${
              product.Product || "Product"
            }</h3>
            <p class="text-xl font-bold text-teal mb-3">₹${
              product.Price || "N/A"
            }</p>
            
            <!-- ✅ FIXED: Button with inline styles to prevent CSS purging -->
            <a href="${productUrl}" 
               target="_blank" 
               style="
                  display: block;
                  width: 100%;
                  background: linear-gradient(to right, #14B8A6, #0D9488); /* Teal gradient */
                  color: white;
                  text-align: center;
                  padding: 0.75rem 1rem;
                  border-radius: 0.5rem;
                  font-weight: 500;
                  text-decoration: none;
                  transition: all 0.2s ease-in-out;
                  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
               "
               onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)';"
               onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)';"
            >
                🛒 Click to Buy
            </a>
        </div>
    `;
    return productCard;
  }

  async function handleImageUpload(file) {
    if (!file.type.match("image.*")) {
      alert("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onload = async function (e) {
      previewImage.src = e.target.result;
      showPreview();

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
        const base64Image = e.target.result.split(",")[1];
        currentImageBase64 = base64Image;

        startBackgroundPreloading(base64Image);

        const description = await getImageDescription(base64Image);

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

  async function getImageDescription(base64Image) {
    try {
      detectedItems.innerHTML = `
                <div class="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg">
                    <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <div>
                        <p class="font-medium text-blue-900">Analyzing Image...</p>
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

  function displayDescription(description) {
    const descriptionPoints = description
      .split("\n")
      .filter((point) => point.trim() !== "");

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

  function showPreview() {
    uploadContainer.classList.add("hidden");
    previewSection.classList.remove("hidden");
    previewSection.classList.add("fade-in");
  }

  const navbar = document.querySelector(".glass-navbar");

  navbar.style.backdropFilter = "blur(12px) saturate(160%)";
  navbar.style.backgroundColor = "rgba(255, 255, 255, 0.25)";
  navbar.style.webkitBackdropFilter = "blur(12px) saturate(160%)";

  document.addEventListener("mousemove", (e) => {
    const x = e.clientX / window.innerWidth;
    const y = e.clientY / window.innerHeight;
    navbar.style.setProperty("--mouse-x", x);
    navbar.style.setProperty("--mouse-y", y);
  });

  let lastScrollY = window.scrollY;

  window.addEventListener("scroll", () => {
    const scrollBlur = Math.min(12 + window.scrollY / 20, 20);

    const opacityDirection = window.scrollY > lastScrollY ? 0.2 : 0.25;
    const scrollOpacity = Math.max(
      0.15,
      opacityDirection - window.scrollY / 1000
    );

    navbar.style.backdropFilter = `blur(${scrollBlur}px) saturate(160%)`;
    navbar.style.backgroundColor = `rgba(255, 255, 255, ${scrollOpacity})`;

    lastScrollY = window.scrollY;
  });

  function initScrollAnimations() {
    const animateElements = document.querySelectorAll(
      ".tech-card, .timeline-item"
    );

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-fadeInUp");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    animateElements.forEach((el) => observer.observe(el));
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (document.querySelector(".behind-the-tech-page")) {
      initScrollAnimations();
    }

    if (document.querySelector(".faqs-page")) {
      const faqQuestions = document.querySelectorAll(".faq-question");

      faqQuestions.forEach((question) => {
        question.addEventListener("click", () => {
          const faqItem = question.parentElement;
          const answer = question.nextElementSibling;

          faqQuestions.forEach((q) => {
            if (q !== question) {
              q.classList.remove("active");
              q.nextElementSibling.classList.remove("active");
            }
          });

          question.classList.toggle("active");
          answer.classList.toggle("active");

          if (window.innerWidth < 768 && answer.classList.contains("active")) {
            setTimeout(() => {
              faqItem.scrollIntoView({
                behavior: "smooth",
                block: "nearest",
              });
            }, 300);
          }
        });
      });

      const animateFAQItems = () => {
        const faqItems = document.querySelectorAll(".faq-item");
        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                entry.target.classList.add("animate-fadeInUp");
                observer.unobserve(entry.target);
              }
            });
          },
          { threshold: 0.1 }
        );

        faqItems.forEach((item, index) => {
          // Add delay based on index for staggered animation
          item.style.animationDelay = `${index * 0.1}s`;
          observer.observe(item);
        });
      };

      animateFAQItems();
    }
  });
});

document.addEventListener("DOMContentLoaded", function () {
  if (document.querySelector(".faqs-page")) {
    const faqQuestions = document.querySelectorAll(".faq-question");

    faqQuestions.forEach((question) => {
      question.addEventListener("click", () => {
        const faqItem = question.parentElement;
        const answer = question.nextElementSibling;

        faqQuestions.forEach((q) => {
          if (q !== question) {
            q.classList.remove("active");
            q.nextElementSibling.classList.remove("active");
          }
        });

        question.classList.toggle("active");
        answer.classList.toggle("active");

        if (window.innerWidth < 768 && answer.classList.contains("active")) {
          setTimeout(() => {
            faqItem.scrollIntoView({
              behavior: "smooth",
              block: "nearest",
            });
          }, 300);
        }
      });
    });

    const animateFAQItems = () => {
      const faqItems = document.querySelectorAll(".faq-item");
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("animate-fadeInUp");
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.1 }
      );

      faqItems.forEach((item, index) => {
        item.style.animationDelay = `${index * 0.1}s`;
        observer.observe(item);
      });
    };

    animateFAQItems();
  }
});
