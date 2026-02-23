import { Metadata } from 'next';
import Link from 'next/link';
import { Calendar, User, ArrowRight, BookOpen, TrendingUp, Tag } from 'lucide-react';
import { getBlogPosts, getFeaturedPosts, getCategories } from '@/lib/supabase/queries/blog';
import { Button } from '@/components/ui/Button';

export const metadata: Metadata = {
  title: 'Blog | Xarastore Insights & Updates',
  description: 'Latest news, tips, and insights about shopping, deals, and trends on Xarastore.',
};

export default async function BlogPage() {
  const [posts, featuredPosts, categories] = await Promise.all([
    getBlogPosts(),
    getFeaturedPosts(),
    getCategories(),
  ]);

  const popularTags = [
    'Shopping Tips', 'Deals', 'Electronics', 'Fashion', 'Home Decor',
    'Beauty', 'Tech', 'Lifestyle', 'Budgeting', 'Trends',
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-red-600 to-red-800 text-white">
        <div className="container-responsive py-16 md:py-24">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center px-4 py-2 bg-white/20 rounded-full mb-6">
              <BookOpen className="w-5 h-5 mr-2" />
              <span className="font-medium">Xarastore Blog</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Insights & Updates
            </h1>
            <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
              Discover shopping tips, latest trends, product guides, and exclusive deals
              to make the most of your Xarastore experience.
            </p>
            <div className="max-w-md mx-auto">
              <form className="flex">
                <input
                  type="search"
                  placeholder="Search blog posts..."
                  className="flex-1 px-6 py-3 rounded-l-lg text-gray-900 outline-none"
                />
                <Button type="submit" variant="secondary" className="rounded-l-none">
                  Search
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>

      <div className="container-responsive py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Featured Posts */}
            {featuredPosts.length > 0 && (
              <section className="mb-12">
                <h2 className="text-2xl font-bold mb-6">Featured Posts</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  {featuredPosts.slice(0, 2).map((post) => (
                    <article key={post.id} className="group">
                      <Link href={`/blog/${post.slug}`}>
                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
                          <div className="aspect-video bg-gray-100 relative overflow-hidden">
                            {post.image && (
                              <img
                                src={post.image}
                                alt={post.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            )}
                            <div className="absolute top-4 left-4">
                              <span className="px-3 py-1 bg-red-600 text-white text-sm font-medium rounded-full">
                                Featured
                              </span>
                            </div>
                          </div>
                          <div className="p-6">
                            <div className="flex items-center text-sm text-gray-600 mb-3">
                              <Calendar className="w-4 h-4 mr-2" />
                              <time dateTime={post.publishedAt}>
                                {new Date(post.publishedAt).toLocaleDateString('en-KE', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                })}
                              </time>
                              <span className="mx-2">•</span>
                              <span>{post.readTime} min read</span>
                            </div>
                            <h3 className="text-xl font-bold mb-3 group-hover:text-red-600 transition-colors">
                              {post.title}
                            </h3>
                            <p className="text-gray-600 mb-4 line-clamp-2">
                              {post.excerpt}
                            </p>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <div className="w-8 h-8 bg-gray-200 rounded-full mr-2"></div>
                                <span className="text-sm font-medium">{post.author}</span>
                              </div>
                              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-red-600 transition-colors" />
                            </div>
                          </div>
                        </div>
                      </Link>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {/* Latest Posts */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Latest Articles</h2>
                <Button variant="link" href="/blog/all">
                  View All
                </Button>
              </div>
              <div className="space-y-8">
                {posts.map((post) => (
                  <article key={post.id} className="group">
                    <Link href={`/blog/${post.slug}`}>
                      <div className="bg-white rounded-xl border border-gray-200 p-6 hover:border-red-300 hover:shadow-md transition-all">
                        <div className="md:flex">
                          <div className="md:w-48 md:h-32 flex-shrink-0 mb-4 md:mb-0 md:mr-6">
                            <div className="aspect-video md:aspect-auto md:h-full bg-gray-100 rounded-lg overflow-hidden">
                              {post.image && (
                                <img
                                  src={post.image}
                                  alt={post.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              )}
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center text-sm text-gray-600 mb-3">
                              <Calendar className="w-4 h-4 mr-2" />
                              <time dateTime={post.publishedAt}>
                                {new Date(post.publishedAt).toLocaleDateString('en-KE', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                })}
                              </time>
                              <span className="mx-2">•</span>
                              <span>{post.readTime} min read</span>
                            </div>
                            <h3 className="text-xl font-bold mb-3 group-hover:text-red-600 transition-colors">
                              {post.title}
                            </h3>
                            <p className="text-gray-600 mb-4 line-clamp-2">
                              {post.excerpt}
                            </p>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <div className="w-8 h-8 bg-gray-200 rounded-full mr-2"></div>
                                <span className="text-sm font-medium">{post.author}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                {post.category && (
                                  <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                                    {post.category}
                                  </span>
                                )}
                                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-red-600 transition-colors" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </article>
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Categories */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
              <h3 className="font-bold text-lg mb-4">Categories</h3>
              <div className="space-y-3">
                {categories.map((category) => (
                  <Link
                    key={category.id}
                    href={`/blog/category/${category.slug}`}
                    className="flex items-center justify-between group"
                  >
                    <span className="group-hover:text-red-600 transition-colors">
                      {category.name}
                    </span>
                    <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {category.postCount}
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Popular Tags */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
              <div className="flex items-center mb-4">
                <TrendingUp className="w-5 h-5 text-red-600 mr-2" />
                <h3 className="font-bold text-lg">Popular Tags</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {popularTags.map((tag) => (
                  <a
                    key={tag}
                    href={`/blog/tag/${tag.toLowerCase().replace(/\s+/g, '-')}`}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-red-100 text-gray-700 hover:text-red-700 text-sm rounded-full transition-colors"
                  >
                    {tag}
                  </a>
                ))}
              </div>
            </div>

            {/* Newsletter */}
            <div className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-xl p-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-lg mb-2">Stay Updated</h3>
                <p className="text-gray-700 mb-4 text-sm">
                  Get the latest posts, deals, and shopping tips delivered to your inbox.
                </p>
                <form className="space-y-3">
                  <input
                    type="email"
                    placeholder="Your email address"
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-red-500 outline-none"
                    required
                  />
                  <Button type="submit" variant="primary" className="w-full">
                    Subscribe
                  </Button>
                </form>
                <p className="text-xs text-gray-600 mt-3">
                  No spam. Unsubscribe anytime.
                </p>
              </div>
            </div>

            {/* Popular Posts */}
            <div className="mt-8 bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-bold text-lg mb-4">Most Read</h3>
              <div className="space-y-4">
                {posts.slice(0, 3).map((post) => (
                  <Link
                    key={post.id}
                    href={`/blog/${post.slug}`}
                    className="group flex items-start space-x-3"
                  >
                    <div className="w-16 h-16 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                      {post.image && (
                        <img
                          src={post.image}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium text-sm group-hover:text-red-600 transition-colors line-clamp-2">
                        {post.title}
                      </h4>
                      <div className="flex items-center text-xs text-gray-500 mt-1">
                        <Calendar className="w-3 h-3 mr-1" />
                        {new Date(post.publishedAt).toLocaleDateString('en-KE', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
