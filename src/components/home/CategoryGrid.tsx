import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

// Import category images
import electronicsImg from "@/assets/categories/electronics.jpg";
import fashionImg from "@/assets/categories/fashion.jpg";
import homeGardenImg from "@/assets/categories/home-garden.jpg";
import sportsImg from "@/assets/categories/sports.jpg";
import toysImg from "@/assets/categories/toys.jpg";
import beautyImg from "@/assets/categories/beauty.jpg";
import automotiveImg from "@/assets/categories/automotive.jpg";
import jewelryImg from "@/assets/categories/jewelry.jpg";
import babyKidsImg from "@/assets/categories/baby-kids.jpg";
import toolsImg from "@/assets/categories/tools.jpg";
import watchesImg from "@/assets/categories/watches.jpg";
import audioImg from "@/assets/categories/audio.jpg";

const categories = [
  { name: "Electronics", image: electronicsImg, color: "from-blue-500 to-indigo-600", shadowColor: "shadow-blue-500/20", href: "/category/electronics" },
  { name: "Fashion", image: fashionImg, color: "from-pink-500 to-rose-600", shadowColor: "shadow-pink-500/20", href: "/category/fashion" },
  { name: "Home & Garden", image: homeGardenImg, color: "from-emerald-500 to-green-600", shadowColor: "shadow-emerald-500/20", href: "/category/home-garden" },
  { name: "Sports", image: sportsImg, color: "from-orange-500 to-amber-600", shadowColor: "shadow-orange-500/20", href: "/category/sports" },
  { name: "Toys & Games", image: toysImg, color: "from-purple-500 to-violet-600", shadowColor: "shadow-purple-500/20", href: "/category/toys" },
  { name: "Beauty", image: beautyImg, color: "from-rose-400 to-pink-600", shadowColor: "shadow-rose-500/20", href: "/category/beauty" },
  { name: "Automotive", image: automotiveImg, color: "from-slate-600 to-gray-700", shadowColor: "shadow-slate-500/20", href: "/category/automotive" },
  { name: "Jewelry", image: jewelryImg, color: "from-amber-400 to-yellow-600", shadowColor: "shadow-amber-500/20", href: "/category/jewelry" },
  { name: "Baby & Kids", image: babyKidsImg, color: "from-sky-400 to-cyan-600", shadowColor: "shadow-sky-500/20", href: "/category/baby-kids" },
  { name: "Tools", image: toolsImg, color: "from-zinc-500 to-neutral-700", shadowColor: "shadow-zinc-500/20", href: "/category/tools" },
  { name: "Watches", image: watchesImg, color: "from-indigo-500 to-blue-700", shadowColor: "shadow-indigo-500/20", href: "/category/watches" },
  { name: "Audio", image: audioImg, color: "from-red-500 to-rose-700", shadowColor: "shadow-red-500/20", href: "/category/audio" },
];

export function CategoryGrid() {
  return (
    <section className="py-10">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="w-1 h-8 rounded-full bg-gradient-to-b from-primary to-orange-400 shrink-0" />
            <h2 className="text-xl sm:text-3xl font-bold text-foreground truncate">
              Shop by Category
            </h2>
          </div>
          <p className="text-muted-foreground ml-3 text-sm sm:text-base truncate">
            Find exactly what you need in our curated collections
          </p>
        </div>
        <Link 
          to="/categories" 
          className="hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300 font-medium text-sm group"
        >
          View All
          <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
      
      {/* Categories Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-5">
        {categories.map((category, index) => (
          <Link
            key={category.name}
            to={category.href}
            className="group relative"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className={`relative overflow-hidden rounded-3xl backdrop-blur-2xl bg-gradient-to-b from-cyan-100/30 via-blue-50/20 to-transparent dark:from-cyan-900/20 dark:via-blue-900/10 dark:to-transparent border border-cyan-200/40 dark:border-cyan-500/20 p-4 sm:p-5 transition-all duration-500 hover:shadow-[0_8px_32px_rgba(34,211,238,0.3)] hover:-translate-y-2 hover:border-cyan-300/60 dark:hover:border-cyan-400/40`}>
              {/* Water ripple effect layers */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-cyan-100/20 to-blue-100/30 dark:from-white/10 dark:via-cyan-500/10 dark:to-blue-500/20 opacity-60" />
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-cyan-200/40 dark:via-white/5 dark:to-cyan-400/20" />
              
              {/* Water surface reflection */}
              <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/50 to-transparent dark:from-white/20 rounded-t-3xl" />
              
              {/* Bubble highlights */}
              <div className="absolute top-3 right-4 w-2 h-2 rounded-full bg-white/60 dark:bg-white/30" />
              <div className="absolute top-6 right-8 w-1.5 h-1.5 rounded-full bg-white/40 dark:bg-white/20" />
              <div className="absolute bottom-8 left-3 w-1 h-1 rounded-full bg-white/50 dark:bg-white/25 group-hover:animate-pulse" />
              
              {/* Image container */}
              <div className="relative flex flex-col items-center text-center gap-3">
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(34,211,238,0.25)] group-hover:scale-110 group-hover:rotate-2 transition-all duration-500 border-2 border-white/40">
                  <img 
                    src={category.image} 
                    alt={category.name}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Water glass overlay on image */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/30 via-white/10 to-transparent" />
                  <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/40 to-transparent" />
                </div>
                
                {/* Category name */}
                <div className="space-y-1">
                  <h3 className="font-semibold text-sm sm:text-base text-foreground group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors drop-shadow-sm">
                    {category.name}
                  </h3>
                  <span className="text-xs text-muted-foreground group-hover:text-cyan-500/70 transition-colors flex items-center justify-center gap-1">
                    Shop Now
                    <ChevronRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Mobile View All Button */}
      <div className="flex sm:hidden justify-center mt-6">
        <Link 
          to="/categories" 
          className="flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-medium text-sm shadow-lg shadow-primary/30"
        >
          View All Categories
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
