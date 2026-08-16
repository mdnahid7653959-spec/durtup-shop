import { getCachedMohasagorProducts, filterProductsByCategory } from './src/utils/mohasagorCache.js';

async function test() {
  const all = await getCachedMohasagorProducts();
  console.log("Total products:", all.length);
  
  const tech = filterProductsByCategory(all, "electronics");
  console.log("Tech count:", tech.length, "Sample:", tech[0]?.name, tech[0]?.image);

  const fashion = filterProductsByCategory(all, "fashion");
  console.log("Fashion count:", fashion.length, "Sample:", fashion[0]?.name, fashion[0]?.image);

  const home = filterProductsByCategory(all, "home");
  console.log("Home count:", home.length, "Sample:", home[0]?.name, home[0]?.image);

  const beauty = filterProductsByCategory(all, "beauty");
  console.log("Beauty count:", beauty.length, "Sample:", beauty[0]?.name, beauty[0]?.image);
}

test();
