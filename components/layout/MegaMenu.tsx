'use client';

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef
} from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  ChevronDown,
  Sparkles,
  TrendingUp,
  Clock,
  Star,
  AlertCircle
} from 'lucide-react';

import { getCategories } from '@/lib/supabase/queries/products';
import { logger } from '@/lib/utils/logger';

import { MegaMenuCategoryPreview } from './MegaMenuCategoryPreview';

/* --------------------------------------------------- */
/* Types */
/* --------------------------------------------------- */

interface Category {
  id: string;
  slug: string;
  name: string;
  productCount: number;
}

/* --------------------------------------------------- */
/* Config */
/* --------------------------------------------------- */

const MAX_RETRIES = 3;
const HOVER_DELAY = 120;
const CACHE_TTL = 10 * 60 * 1000;

/* --------------------------------------------------- */
/* Cache */
/* --------------------------------------------------- */

let cachedCategories: Category[] | null = null;
let cacheTimestamp = 0;

/* --------------------------------------------------- */
/* Component */
/* --------------------------------------------------- */

export function MegaMenu() {

  const router = useRouter();

  const rootRef = useRef<HTMLDivElement | null>(null);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const focusTrapRef = useRef<HTMLDivElement | null>(null);

  const [isOpen,setIsOpen] = useState(false);
  const [pinnedOpen,setPinnedOpen] = useState(false);

  const [categories,setCategories] = useState<Category[]>([]);
  const [activeCategory,setActiveCategory] = useState<string | null>(null);

  const [error,setError] = useState<Error | null>(null);
  const [isLoading,setIsLoading] = useState(true);
  const [retryCount,setRetryCount] = useState(0);

  /* --------------------------------------------------- */
  /* Hover Intent */
  /* --------------------------------------------------- */

  const clearHoverTimer = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  };

  const openHover = () => {

    if (pinnedOpen) return;

    clearHoverTimer();

    hoverTimerRef.current = setTimeout(()=>{
      setIsOpen(true)
    },HOVER_DELAY);

  };

  const closeHover = () => {

    if (pinnedOpen) return;

    clearHoverTimer();

    hoverTimerRef.current = setTimeout(()=>{
      setIsOpen(false)
    },HOVER_DELAY);

  };

  /* --------------------------------------------------- */
  /* Toggle Pin */
  /* --------------------------------------------------- */

  const togglePinned = useCallback(()=>{

    setPinnedOpen(prev=>{
      const next = !prev
      setIsOpen(next)
      return next
    })

  },[])

  /* --------------------------------------------------- */
  /* Keyboard */
  /* --------------------------------------------------- */

  useEffect(()=>{

    function handleKey(e:KeyboardEvent){

      if(e.key === 'Escape'){
        setPinnedOpen(false)
        setIsOpen(false)
      }

    }

    document.addEventListener('keydown',handleKey)

    return ()=>document.removeEventListener('keydown',handleKey)

  },[])

  /* --------------------------------------------------- */
  /* Focus Trap */
  /* --------------------------------------------------- */

  useEffect(()=>{

    if(!pinnedOpen) return

    const focusable = focusTrapRef.current?.querySelectorAll<HTMLElement>('a,button')

    if(!focusable?.length) return

    const first = focusable[0]
    const last = focusable[focusable.length-1]

    function trap(e:KeyboardEvent){

      if(e.key !== 'Tab') return

      if(e.shiftKey && document.activeElement === first){
        e.preventDefault()
        last.focus()
      }

      if(!e.shiftKey && document.activeElement === last){
        e.preventDefault()
        first.focus()
      }

    }

    document.addEventListener('keydown',trap)

    return ()=>document.removeEventListener('keydown',trap)

  },[pinnedOpen])

  /* --------------------------------------------------- */
  /* Outside click */
  /* --------------------------------------------------- */

  useEffect(()=>{

    function handleOutside(e:MouseEvent){

      if(!rootRef.current) return

      if(!rootRef.current.contains(e.target as Node)){
        setPinnedOpen(false)
        setIsOpen(false)
      }

    }

    document.addEventListener('mousedown',handleOutside)

    return ()=>document.removeEventListener('mousedown',handleOutside)

  },[])

  /* --------------------------------------------------- */
  /* Category loader */
  /* --------------------------------------------------- */

  const loadCategories = useCallback(async()=>{

    if(
      cachedCategories &&
      Date.now() - cacheTimestamp < CACHE_TTL
    ){
      setCategories(cachedCategories)
      setIsLoading(false)
      return
    }

    if(abortControllerRef.current){
      abortControllerRef.current.abort()
    }

    abortControllerRef.current = new AbortController()

    try{

      setIsLoading(true)
      setError(null)

      if(retryCount>0){
        await new Promise(r=>setTimeout(r,retryCount*1000))
      }

      const data = await getCategories()

      if(abortControllerRef.current.signal.aborted) return

      const sliced = (data || []).slice(0,8)

      cachedCategories = sliced
      cacheTimestamp = Date.now()

      setCategories(sliced)
      setRetryCount(0)

    }catch(err){

      if(err instanceof Error && err.name==='AbortError') return

      logger.error('MegaMenu categories failed',err)

      setError(err instanceof Error ? err : new Error('Category load failed'))
      setRetryCount(p=>Math.min(p+1,MAX_RETRIES))

    }finally{

      if(!abortControllerRef.current?.signal.aborted){
        setIsLoading(false)
      }

    }

  },[retryCount])

  useEffect(()=>{

    loadCategories()

    return ()=>{
      abortControllerRef.current?.abort()
      clearHoverTimer()
    }

  },[loadCategories])

  /* --------------------------------------------------- */
  /* Prefetch */
  /* --------------------------------------------------- */

  const prefetchCategory = (slug:string)=>{
    router.prefetch(`/category/${slug}`)
  }

  /* --------------------------------------------------- */
  /* Featured panels */
  /* --------------------------------------------------- */

  const featured = useMemo(()=>[

    {
      name:'Deal of the Day',
      desc:'Limited time offers',
      icon:Sparkles,
      href:'/deals/today',
      gradient:'from-red-600 to-red-800'
    },

    {
      name:'Trending Now',
      desc:'Most popular items',
      icon:TrendingUp,
      href:'/trending',
      gradient:'from-orange-600 to-orange-800'
    },

    {
      name:'New Arrivals',
      desc:'Latest products',
      icon:Clock,
      href:'/new',
      gradient:'from-blue-600 to-blue-800'
    },

    {
      name:'Top Rated',
      desc:'Customer favorites',
      icon:Star,
      href:'/top-rated',
      gradient:'from-green-600 to-green-800'
    }

  ],[])

  /* --------------------------------------------------- */
  /* Render */
  /* --------------------------------------------------- */

  return (

  <div ref={rootRef} className="relative">

    <button
      aria-haspopup="menu"
      aria-expanded={isOpen}
      onClick={togglePinned}
      onMouseEnter={openHover}
      onMouseLeave={closeHover}
      className="flex items-center space-x-1 font-medium text-gray-700 hover:text-red-600 transition-colors"
    >

      <span>Categories</span>

      <ChevronDown
        className={`w-4 h-4 transition-transform ${isOpen?'rotate-180':''}`}
      />

    </button>

    {isOpen && (

        <div
          ref={focusTrapRef}
          role="menu"
          onMouseEnter={openHover}
          onMouseLeave={closeHover}
          className="
          absolute
          top-full
          left-1/3
          -translate-x-1/2
          mt-4
          w-screen
          max-w-[1280px]
          bg-white
          border
          border-gray-200
          rounded-xl
          shadow-2xl
          z-[999]
          overflow-hidden
          animate-in
          fade-in
          zoom-in
          duration-150
          px-4
          md:px-0
          "
        >

      <div className="p-8">

        {error && !isLoading && categories.length===0 ? (

        <div className="text-center py-12">

          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4"/>

          <p className="font-medium mb-2">Unable to load categories</p>

          <p className="text-sm text-gray-500 mb-6">
            {error.message}
          </p>

          <button
            onClick={loadCategories}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Retry
          </button>

        </div>

        ):(

        <div className="grid grid-cols-4 gap-8">

        {/* Categories */}

        <div className="col-span-3">

        <div className="grid grid-cols-3 gap-6">

        {isLoading ?

        Array.from({length:6}).map((_,i)=>(

        <div key={i} className="animate-pulse">

          <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"/>

          <div className="space-y-2">

          {Array.from({length:4}).map((_,j)=>(
            <div key={j} className="h-3 bg-gray-100 rounded"/>
          ))}

          </div>

        </div>

        ))

        :

        categories.map(category=>(

        <div key={category.id}>

        <Link
          href={`/category/${category.slug}`}
          onMouseEnter={()=>{
            setActiveCategory(category.slug)
            prefetchCategory(category.slug)
          }}
          className="font-semibold text-gray-900 hover:text-red-600 block mb-3"
        >

          {category.name}

          {category.productCount>0 &&(
            <span className="ml-2 text-xs text-gray-500">
              ({category.productCount})
            </span>
          )}

        </Link>

        <div className="space-y-2">

        {[
          'Best Sellers',
          'New Arrivals',
          'On Sale',
          'Top Rated'
        ].map(sub=>(

        <Link
          key={sub}
          href={`/category/${category.slug}?filter=${sub.toLowerCase().replace(' ','-')}`}
          className="block text-sm text-gray-600 hover:text-red-600"
        >
          {sub}
        </Link>

        ))}

        </div>

        </div>

        ))

        }

        </div>

        </div>

        {/* Preview */}

        <div className="border-l border-gray-100 pl-8">

        <h3 className="font-semibold text-gray-900 mb-4">
        Preview
        </h3>

        <MegaMenuCategoryPreview
          categorySlug={activeCategory}
        />

        </div>

        </div>

        )}

        {/* Banner */}

        {!error && (

        <div className="mt-8 pt-8 border-t border-gray-100">

        <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-xl p-6 flex items-center justify-between">

        <div>

        <h3 className="font-semibold mb-2">
        Need help choosing?
        </h3>

        <p className="text-sm text-gray-600">
        Get personalized recommendations
        </p>

        </div>

        <Link
          href="/help/shopping-assistance"
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
        Get Help
        </Link>

        </div>

        </div>

        )}

      </div>

    </div>

    )}

  </div>

  )

}

