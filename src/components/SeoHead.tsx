import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";
import {
  canonicalUrlFromLocation,
  DEFAULT_META_DESCRIPTION,
  DEFAULT_PAGE_TITLE,
  getOgImageAbsoluteUrl,
} from "@/lib/seo";

/**
 * SPA içinde gezinirken document head + Open Graph / Twitter meta güncellenir.
 * JS çalıştırmayan botlar için kök `index.html` ile aynı marka metinleri kullanılır.
 */
export function SeoHead() {
  const { pathname, search } = useLocation();
  const canonical = canonicalUrlFromLocation(pathname, search);
  const image = getOgImageAbsoluteUrl();
  const title = DEFAULT_PAGE_TITLE;
  const description = DEFAULT_META_DESCRIPTION;

  return (
    <Helmet htmlAttributes={{ lang: "tr" }}>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />

      <meta property="og:site_name" content="INFUHUB" />
      <meta property="og:url" content={canonical} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      <meta property="og:image" content={image} />
      <meta property="og:locale" content="tr_TR" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@infuhub" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
}
