import { useEffect } from "react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

interface SEOHeadProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
  product?: {
    name: string;
    price: number;
    currency?: string;
    availability?: string;
    image?: string;
  };
}

export function SEOHead({
  title,
  description,
  image,
  url,
  type = "website",
  product,
}: SEOHeadProps) {
  const { rawSettings: settings } = useSiteSettings();

  useEffect(() => {
    const finalTitle = title || settings?.metaTitle || "MegaMart";
    const finalDescription = description || settings?.metaDescription || "";
    const finalImage = image || settings?.ogImage || "";
    const finalUrl = url || window.location.href;

    // Update document title
    document.title = finalTitle;

    // Update or create meta tags
    const updateMeta = (name: string, content: string, property?: boolean) => {
      if (!content) return;
      
      const attr = property ? "property" : "name";
      let meta = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement;
      
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute(attr, name);
        document.head.appendChild(meta);
      }
      
      meta.content = content;
    };

    // Basic meta tags
    updateMeta("description", finalDescription);

    // Open Graph tags
    updateMeta("og:title", finalTitle, true);
    updateMeta("og:description", finalDescription, true);
    updateMeta("og:type", type, true);
    updateMeta("og:url", finalUrl, true);
    if (finalImage) {
      updateMeta("og:image", finalImage, true);
    }

    // Twitter Card tags
    updateMeta("twitter:card", "summary_large_image");
    updateMeta("twitter:title", finalTitle);
    updateMeta("twitter:description", finalDescription);
    if (finalImage) {
      updateMeta("twitter:image", finalImage);
    }

    // Product-specific schema
    if (product) {
      const existingSchema = document.querySelector('script[type="application/ld+json"]');
      if (existingSchema) {
        existingSchema.remove();
      }

      const schema = {
        "@context": "https://schema.org/",
        "@type": "Product",
        name: product.name,
        image: product.image || finalImage,
        description: finalDescription,
        offers: {
          "@type": "Offer",
          price: product.price,
          priceCurrency: product.currency || settings?.currency || "USD",
          availability: product.availability || "https://schema.org/InStock",
          url: finalUrl,
        },
      };

      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.textContent = JSON.stringify(schema);
      document.head.appendChild(script);
    }

    // Cleanup
    return () => {
      const schema = document.querySelector('script[type="application/ld+json"]');
      if (schema) {
        schema.remove();
      }
    };
  }, [title, description, image, url, type, product, settings]);

  return null;
}
