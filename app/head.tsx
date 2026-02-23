export default function Head() {
  return (
    <>
      <title>Xarastore - it's a deal</title>
      <meta content="width=device-width, initial-scale=1" name="viewport" />
      <meta name="description" content="Shop the best deals on electronics, fashion, home goods, and more. Kenya's fastest-growing online marketplace." />
      <link rel="icon" href="/favicon.ico" />
      
      {/* Preconnect to Supabase */}
      <link rel="preconnect" href={process.env.NEXT_PUBLIC_SUPABASE_URL!} />
      <link rel="dns-prefetch" href={process.env.NEXT_PUBLIC_SUPABASE_URL!} />
      
      {/* Preload critical assets */}
      <link
        rel="preload"
        href="/_next/static/css/app/layout.css"
        as="style"
        type="text/css"
      />
      
      {/* Loading-specific meta tags */}
      <meta name="loading" content="Xarastore is preparing your shopping experience" />
    </>
  );
}
