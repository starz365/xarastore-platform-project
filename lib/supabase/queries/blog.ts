import { supabase } from '../client';

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  image: string | null;
  author: string;
  authorAvatar: string | null;
  publishedAt: string;
  updatedAt: string;
  readTime: number;
  views: number;
  likes: number;
  category: string | null;
  categorySlug: string | null;
  tags: string[];
  featured: boolean;
  status: 'published' | 'draft' | 'archived';
}

export interface BlogCategory {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  postCount: number;
}

export async function getBlogPosts(
  page: number = 1,
  pageSize: number = 10,
  category?: string
): Promise<BlogPost[]> {
  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('blog_posts')
      .select('*')
      .eq('status', 'published')
      .order('published_at', { ascending: false });

    if (category) {
      query = query.eq('category_slug', category);
    }

    const { data, error } = await query.range(from, to);

    if (error) throw error;
    return (data || []).map(transformBlogPost);
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    return [];
  }
}

export async function getFeaturedPosts(): Promise<BlogPost[]> {
  try {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('status', 'published')
      .eq('featured', true)
      .order('published_at', { ascending: false })
      .limit(3);

    if (error) throw error;
    return (data || []).map(transformBlogPost);
  } catch (error) {
    console.error('Error fetching featured posts:', error);
    return [];
  }
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  try {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .single();

    if (error) throw error;
    if (!data) return null;

    // Increment view count
    await supabase
      .from('blog_posts')
      .update({ views: data.views + 1 })
      .eq('id', data.id);

    return transformBlogPost(data);
  } catch (error) {
    console.error('Error fetching blog post by slug:', error);
    return null;
  }
}

export async function getCategories(): Promise<BlogCategory[]> {
  try {
    const { data, error } = await supabase
      .from('blog_categories')
      .select('*')
      .order('name');

    if (error) throw error;
    return (data || []).map(transformBlogCategory);
  } catch (error) {
    console.error('Error fetching blog categories:', error);
    return [];
  }
}

export async function getRelatedPosts(
  currentPostId: string,
  category: string,
  limit: number = 3
): Promise<BlogPost[]> {
  try {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('status', 'published')
      .eq('category_slug', category)
      .neq('id', currentPostId)
      .order('published_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []).map(transformBlogPost);
  } catch (error) {
    console.error('Error fetching related posts:', error);
    return [];
  }
}

export async function searchPosts(query: string): Promise<BlogPost[]> {
  try {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('status', 'published')
      .or(`title.ilike.%${query}%,excerpt.ilike.%${query}%,content.ilike.%${query}%`)
      .order('published_at', { ascending: false })
      .limit(10);

    if (error) throw error;
    return (data || []).map(transformBlogPost);
  } catch (error) {
    console.error('Error searching blog posts:', error);
    return [];
  }
}

export async function getPopularPosts(limit: number = 5): Promise<BlogPost[]> {
  try {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('status', 'published')
      .order('views', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []).map(transformBlogPost);
  } catch (error) {
    console.error('Error fetching popular posts:', error);
    return [];
  }
}

// Transform functions
function transformBlogPost(data: any): BlogPost {
  return {
    id: data.id,
    slug: data.slug,
    title: data.title,
    excerpt: data.excerpt,
    content: data.content,
    image: data.image,
    author: data.author,
    authorAvatar: data.author_avatar,
    publishedAt: data.published_at,
    updatedAt: data.updated_at,
    readTime: data.read_time || 5,
    views: data.views || 0,
    likes: data.likes || 0,
    category: data.category,
    categorySlug: data.category_slug,
    tags: data.tags || [],
    featured: data.featured || false,
    status: data.status,
  };
}

function transformBlogCategory(data: any): BlogCategory {
  return {
    id: data.id,
    slug: data.slug,
    name: data.name,
    description: data.description,
    postCount: data.post_count || 0,
  };
}
