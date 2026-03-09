interface Category {
  id: string
  name: string
  slug: string
  productCount: number
  popularity?: number
}

export function rankCategories(
  categories: Category[]
) {

  return [...categories].sort((a,b)=>{

    const scoreA =
      (a.productCount || 0) * 0.6 +
      (a.popularity || 0) * 0.4

    const scoreB =
      (b.productCount || 0) * 0.6 +
      (b.popularity || 0) * 0.4

    return scoreB - scoreA

  })

}
```
```ts
interface Category {
  id: string
  name: string
  slug: string
  productCount: number
  popularity?: number
}

export function rankCategories(
  categories: Category[]
) {

  return [...categories].sort((a,b)=>{

    const scoreA =
      (a.productCount || 0) * 0.6 +
      (a.popularity || 0) * 0.4

    const scoreB =
      (b.productCount || 0) * 0.6 +
      (b.popularity || 0) * 0.4

    return scoreB - scoreA

  })

}

