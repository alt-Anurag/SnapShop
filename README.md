# SnapShop 🛍️✨ - AI-Powered Visual Shopping Assistant
**🚀 Visit Here: https://snapshop-anurag.netlify.app/# 🚀**
SnapShop is an intelligent visual shopping assistant that transforms the way you discover products. Simply upload an image of an item you like, and SnapShop's AI will identify it, describe its key features, and recommend visually similar products available for purchase from a live database.

---
## Table of Contents

- [About The Project](#about-the-project)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Application Flow & Pipeline](#application-flow--pipeline)
- [Performance Optimization: Solving the Cold Start Problem](#performance-optimization-solving-the-cold-start-problem)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
- [Configuration](#configuration)
- [Project Structure](#project-structure)
- [Contact](#contact)

## About The Project

SnapShop bridges the gap between seeing something you desire and finding it online. Traditional text-based search can be limiting when trying to describe a visual item. This project leverages a powerful combination of generative AI, vector search, and a serverless architecture to provide an intuitive, image-first shopping experience.

The user can upload an image from their device or take a photo, and the application will:
1.  Generate a textual description of the clothing item using **Google's Gemini API**.
2.  Find and display the top 5 visually similar products from a pre-populated **Supabase** database using **CLIP embeddings** and **vector similarity search**.

## Key Features

-   **Image Upload & Camera Access:** Supports drag-and-drop, file browsing, and direct camera access.
-   **AI-Powered Image Description:** Uses the Gemini Pro Vision model to analyze and describe the product in the user's image.
-   **Visual Similarity Search:** Leverages a custom-built Hugging Face Space API with a CLIP model to generate image embeddings.
-   **Vector Database Search:** Compares image embeddings against a Supabase Postgres database with the `pgvector` extension to find the closest matches.
-   **Dynamic Product Recommendations:** Displays the top 5 matching products with their image, name, price, and a direct "Click to Buy" link.
-   **Optimized for Performance:** Implements a smart background preloading strategy to overcome API cold starts and deliver a smooth user experience.
-   **Fully Responsive UI:** A clean and modern interface built with Tailwind CSS that works seamlessly on all devices.

## Tech Stack

A complete serverless, AI-driven stack:

| Category          | Technology                                                                                                                                                                                                                                                                                         |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Frontend**      | ![HTML5](https://img.shields.io/badge/html5-%23E34F26.svg?style=for-the-badge&logo=html5&logoColor=white) ![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white) ![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E) |
| **Backend**       | ![Netlify Functions](https://img.shields.io/badge/Netlify-Functions-00C7B7?style=for-the-badge&logo=netlify&logoColor=white)                                                                                                                                                                            |
| **AI & ML**       | ![Google Gemini](https://img.shields.io/badge/Google-Gemini_API-4285F4?style=for-the-badge&logo=google&logoColor=white) ![Hugging Face](https://img.shields.io/badge/%F0%9F%A4%97%20Hugging%20Face-API-FFD21E.svg?style=for-the-badge)                                                                  |
| **Database**      | ![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white) (Postgres with `pgvector` for vector search & Storage for image hosting)                                                                                                                     |
| **Deployment**    | ![Netlify](https://img.shields.io/badge/Netlify-00C7B7?style=for-the-badge&logo=netlify&logoColor=white)                                                                                                                                                                                                |

## Application Flow & Pipeline

The project follows a sophisticated, multi-step pipeline to deliver recommendations.

```
graph TD
    A[1. User Uploads Image] --> B{Frontend};
    B --> |Sends base64 image| C[Netlify Function: describe-image];
    C --> D[Google Gemini API];
    D --> |Returns Text Description| C;
    C --> |Displays Description| B;

    subgraph "Background Preloading (Parallel Process)"
        B --> |Sends base64 image| E[Netlify Function: recommend-products];
        E --> |Uploads image| F[Supabase Storage];
        F --> |Returns Public URL| E;
        E --> |Sends URL| G[Hugging Face API (CLIP Model)];
        G --> |Returns 512D Embeddings| E;
        E --> |Vector Search Query| H[Supabase DB (pgvector)];
        H --> |Returns Top 5 Products| E;
    end

    I[2. User clicks 'Find Matching Products'] --> J{Frontend};
    J --> |Retrieves preloaded data| E;
    E --> |Sends Product Data| J;
    J --> K[3. Displays Recommendations];
```

## Performance Optimization: Solving the Cold Start Problem

A key challenge with free-tier serverless functions and ML models is **"cold starts"**—the initial delay while the service wakes up. This caused the first recommendation attempt to fail 90% of the time, leading to a 30-60 second wait for the user.

**Solution: Intelligent Background Preloading**

I re-architected the frontend logic to initiate the entire recommendation pipeline **in the background** the moment the user uploads an image.

-   **Before:** Sequential calls (Gemini → Wait for user click → Hugging Face/Supabase).
-   **After:** Parallel calls (Gemini and Recommendation pipeline start simultaneously).

This means that while the user is reading the AI-generated description (3-5 seconds), the much longer recommendation process (15-25 seconds) is already happening. When the user clicks "Find Matching Products", the results are often already available and are displayed instantly, providing a seamless and responsive experience.

## Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

-   Node.js (v18 or later)
-   npm (or yarn/pnpm)
-   Netlify CLI: `npm install netlify-cli -g`

### Installation

1.  **Clone the repository:**
    ```
    git clone https://github.com/alt-Anurag/SnapShop.git
    cd SnapShop
    ```

2.  **Create an environment file:**
    Create a `.env` file in the root of the project.

3.  **Add your API keys to `.env`:**
    Copy the contents of `.env.example` into your new `.env` file and fill in your credentials. See the [Configuration](#configuration) section for details.

4.  **Install dependencies:**
    ```
    npm install
    ```

5.  **Run the development server:**
    This command will start a local server and handle the serverless functions.
    ```
    netlify dev
    ```
    Your application will be available at `http://localhost:8888`.

## Configuration

Your `.env` file must contain the following keys:

| Variable                     | Description                                                              | Example                                             |
| ---------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------- |
| `GEMINI_API_KEY`             | Your API key for Google's Gemini Pro model.                              | `AIzaSy...`                                         |
| `SUPABASE_URL`               | The URL for your Supabase project.                                       | `https://xyz.supabase.co`                           |
| `SUPABASE_KEY`               | The `anon` key for your Supabase project.                                | `eyJhb...`                                          |
| `HF_API_URL`                 | The full URL to your custom Hugging Face Space API endpoint for embeddings. | `https://your-username-your-space.hf.space/embed` |
| `SUPABASE_BUCKET_PUBLIC_URL` | The public URL prefix for your Supabase Storage bucket.                  | `https://xyz.supabase.co/storage/v1/object/public`  |

## Project Structure

```
.
├── /.netlify/functions/     # Serverless function backend
│   ├── describe-image.js    # Handles Gemini API call
│   └── recommend-products.js # Handles the full recommendation pipeline
├── index.html               # Main HTML file
├── script.js                # Core frontend logic and interactivity
├── style.css                # Tailwind CSS output
├── tailwind.config.js       # Tailwind CSS configuration
└── README.md                # You are here
```

## Contact

Anurag - [@Anurag](https://www.linkedin.com/in/anurag-upadhyay-a56637213/) - anuragupadhyay2002@gmail.com

Project Link: [https://github.com/alt-Anurag/SnapShop](https://github.com/alt-Anurag/SnapShop)
```
