// src/api/barcode.js

// Fetches product information from Open Food Facts API using a barcode number
export async function fetchProductByBarcode(barcode) {
  try {
    const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
    const data = await response.json();

    if (data.status === 1) {
      return {
        success: true,
        name: data.product.product_name || "Unknown Product",
        brand: data.product.brands || "Unknown Brand",
        imageUrl: data.product.image_url || null
      };
    } else {
      return { success: false, message: "Product not found" };
    }
  } catch (error) {
    console.error("API Fetch Error:", error);
    return { success: false, message: "Network error" };
  }
}
