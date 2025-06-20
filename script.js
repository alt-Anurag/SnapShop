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
        window.scrollTo(0, 0);
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
      // Reset scroll position on mobile
      window.scrollTo(0, 0);

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

  // Camera button - NEW IMPLEMENTATION
  cameraBtn.addEventListener("click", async () => {
    try {
      // Create camera modal
      const modal = document.createElement("div");
      modal.className =
        "fixed inset-0 bg-black bg-opacity-75 z-50 flex flex-col items-center justify-center p-4";
      modal.innerHTML = `
        <div class="rounded-lg p-4 max-w-md w-full" style="background-color:rgb(241, 236, 210)";>
          <h3 class="text-xl font-bold mb-4 text-gray-800">Take a Photo</h3>
          <div id="camera-view">
            <video id="camera-feed" autoplay playsinline class="w-full mb-4 rounded-lg border border-gray-200"></video>
          </div>
          <div id="preview-view" class="hidden">
            <img id="capture-preview" class="w-full mb-4 rounded-lg border border-gray-200">
          </div>
          <div class="flex space-x-4" id="camera-controls">
            <button id="capture-btn" class="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition">
              <i class="fas fa-camera mr-2"></i>Capture
            </button>
            <button id="close-camera" class="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition">
              <i class="fas fa-times mr-2"></i>Close
            </button>
          </div>
          <div class="flex space-x-4 hidden" id="preview-controls">
            <button id="retake-btn" class="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition">
              <i class="fas fa-redo mr-2"></i>Retake
            </button>
            <button id="upload-btn" class="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition">
              <i class="fas fa-upload mr-2"></i>Upload
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);
      document.body.style.overflow = "hidden";

      // Start camera stream
      const video = document.getElementById("camera-feed");
      let stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      video.srcObject = stream;

      // Capture button
      document.getElementById("capture-btn").addEventListener("click", () => {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext("2d").drawImage(video, 0, 0);
        const imageData = canvas.toDataURL("image/jpeg");

        // Show preview
        document.getElementById("camera-view").classList.add("hidden");
        document.getElementById("preview-view").classList.remove("hidden");
        document.getElementById("camera-controls").classList.add("hidden");
        document.getElementById("preview-controls").classList.remove("hidden");
        document.getElementById("capture-preview").src = imageData;
      });

      // Retake button
      document.getElementById("retake-btn").addEventListener("click", () => {
        document.getElementById("camera-view").classList.remove("hidden");
        document.getElementById("preview-view").classList.add("hidden");
        document.getElementById("camera-controls").classList.remove("hidden");
        document.getElementById("preview-controls").classList.add("hidden");
      });

      // Upload button
      document.getElementById("upload-btn").addEventListener("click", () => {
        const imageData = document.getElementById("capture-preview").src;

        // Convert base64 to Blob (simulating file upload)
        fetch(imageData)
          .then((res) => res.blob())
          .then((blob) => {
            const file = new File([blob], "capture.jpg", {
              type: "image/jpeg",
            });

            // Simulate file input change event
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            fileInput.files = dataTransfer.files;

            // Trigger file upload handler
            const event = new Event("change");
            fileInput.dispatchEvent(event);

            // Cleanup
            stream.getTracks().forEach((track) => track.stop());
            document.body.style.overflow = "";
            modal.remove();
          });
      });

      // Close button
      document.getElementById("close-camera").addEventListener("click", () => {
        stream.getTracks().forEach((track) => track.stop());
        document.body.style.overflow = "";
        modal.remove();
      });
    } catch (error) {
      console.error("Camera error:", error);
      alert("Could not access camera. Please check permissions.");
    }
  });

  // Sample button
  sampleBtn.addEventListener("click", async () => {
    // Use a sample image for demo
    previewImage.src =
      "https://images.unsplash.com/photo-1490114538077-0a7f8cb49891?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80";
    showPreview();

    // Show loading state
    detectedItems.innerHTML = `
      <div class="space-y-3 text-center py-4">
        <div class="animate-pulse flex flex-col items-center">
          <i class="fas fa-spinner fa-spin text-2xl text-teal mb-2"></i>
          <p class="text-teal font-medium">Analyzing sample image...</p>
          <p class="text-teal-light">Please wait while we process the image</p>
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
        const description = await getImageDescription(base64Image);
        displayDescription(description);
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error("Error with sample image:", error);
      detectedItems.innerHTML = `
        <div class="text-red-500 text-center py-4">
          <i class="fas fa-exclamation-circle mr-2"></i>
          Failed to analyze sample image. Please try again.
        </div>
      `;
    }
  });

  // Find products button
  findProductsBtn.addEventListener("click", () => {
    findProductsBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin mr-2"></i> Searching...';
    findProductsBtn.disabled = true;

    // Simulate API call delay
    setTimeout(() => {
      showResults();
      showRecommendations();
      findProductsBtn.innerHTML =
        '<i class="fas fa-search mr-2"></i>Find Matching Products';
      findProductsBtn.disabled = false;

      // Smooth scroll to results
      resultsSection.scrollIntoView({ behavior: "smooth" });
    }, 1500);
  });

  // Handle image upload
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
        <div class="space-y-3 text-center py-4">
          <div class="animate-pulse flex flex-col items-center">
            <i class="fas fa-spinner fa-spin text-2xl text-teal mb-2"></i>
            <p class="text-teal font-medium">Analyzing image...</p>
            <p class="text-teal-light">Please wait while we process your image</p>
          </div>
        </div>
      `;

      try {
        // Convert image to base64
        const base64Image = e.target.result.split(",")[1];

        // Call the API
        const description = await getImageDescription(base64Image);

        // Display the description
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

  // SINGLE VERSION OF THIS FUNCTION - ALL OTHERS REMOVED
  async function getImageDescription(base64Image) {
    try {
      // First update to "Describing image..."
      detectedItems.innerHTML = `
        <div class="space-y-3 text-center py-4">
          <div class="animate-pulse flex flex-col items-center">
            <i class="fas fa-spinner fa-spin text-2xl text-teal mb-2"></i>
            <p class="text-teal font-medium">Describing image...</p>
            <p class="text-teal-light">Almost done!</p>
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

  // Display the description
  function displayDescription(description) {
    // Split the description into bullet points if it contains newlines
    const descriptionPoints = description.split('\n').filter(point => point.trim() !== '');
    
    // Create HTML for the description
    let descriptionHTML = '<div class="space-y-3">';
    
    descriptionPoints.forEach(point => {
      descriptionHTML += `
        <div class="flex items-center">
          <div class="w-3 h-3 rounded-full bg-teal mr-2 flex-shrink-0"></div>
          <span class="font-medium text-indigo-dark">${point}</span>
        </div>
      `;
    });
    
    descriptionHTML += '</div>';
    
    detectedItems.innerHTML = descriptionHTML;
  }

  // Show preview section
  function showPreview() {
    uploadContainer.classList.add("hidden");
    previewSection.classList.remove("hidden");
    previewSection.classList.add("fade-in");
  }

  // Show results (simulated)
  function showResults() {
    const resultsContainer = resultsSection.querySelector(".grid");
    resultsContainer.innerHTML = "";

    // Simulated product data
    const products = [
      {
        id: 1,
        name: "Biker Leather Jacket",
        price: "Rs.129.99",
        image:
          "https://images.unsplash.com/photo-1551028719-00167b16eac5?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80",
      },
      {
        id: 2,
        name: "Slim Fit Jeans",
        price: "Rs.59.99",
        image:
          "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80",
      },
      {
        id: 3,
        name: "Casual T-Shirt",
        price: "Rs.29.99",
        image:
          "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80",
      },
    ];

    products.forEach((product) => {
      const productCard = document.createElement("div");
      productCard.className =
        "product-card bg-white rounded-xl overflow-hidden fade-in";
      productCard.innerHTML = `
        <img src="${product.image}" alt="${product.name}" class="w-full h-60 object-cover">
        <div class="p-4">
          <h3 class="font-medium text-indigo-dark mb-1">${product.name}</h3>
          <p class="text-teal font-semibold mb-3">${product.price}</p>
          <button class="w-full bg-indigo-dark text-white py-2 rounded-lg hover:bg-indigo-darker transition duration-300 flex items-center justify-center">
            <i class="fas fa-shopping-cart mr-2"></i>View Product
          </button>
        </div>
      `;
      resultsContainer.appendChild(productCard);
    });

    resultsSection.classList.remove("hidden");
  }

  // Show recommendations (simulated)
  function showRecommendations() {
    const recommendationsContainer =
      recommendationsSection.querySelector(".grid");
    recommendationsContainer.innerHTML = "";

    // Simulated recommendation data
    const recommendations = [
      {
        id: 1,
        name: "Aviator Sunglasses",
        price: "Rs.39.99",
        image:
          "https://images.unsplash.com/photo-1511499767150-a48a237f0083?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80",
      },
      {
        id: 2,
        name: "Leather Belt",
        price: "Rs.24.99",
        image:
          "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80",
      },
      {
        id: 3,
        name: "Smart Watch",
        price: "Rs.89.99",
        image:
          "https://images.unsplash.com/photo-1523275335684-37898b6baf30?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80",
      },
      {
        id: 4,
        name: "Leather Wallet",
        price: "Rs.19.99",
        image:
          "https://images.unsplash.com/photo-1584917865442-de89df76afd3?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80",
      },
    ];

    recommendations.forEach((item) => {
      const recommendationCard = document.createElement("div");
      recommendationCard.className =
        "product-card bg-white rounded-xl overflow-hidden fade-in";
      recommendationCard.innerHTML = `
        <img src="${item.image}" alt="${item.name}" class="w-full h-48 object-cover">
        <div class="p-4">
          <h3 class="font-medium text-indigo-dark mb-1">${item.name}</h3>
          <p class="text-teal font-semibold mb-3">${item.price}</p>
          <button class="w-full bg-green text-white py-2 rounded-lg hover:bg-green-light transition duration-300 flex items-center justify-center" style="background-color: var(--green);">
            <i class="fas fa-plus mr-2"></i>Add to Style
          </button>
        </div>
      `;
      recommendationsContainer.appendChild(recommendationCard);
    });

    recommendationsSection.classList.remove("hidden");
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