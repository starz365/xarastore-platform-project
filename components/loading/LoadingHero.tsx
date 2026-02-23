export function LoadingHero() {
  return (
    <section className="bg-gradient-to-r from-gray-200 to-gray-300">
      <div className="container-responsive py-12 md:py-24">
        <div className="max-w-3xl">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-gray-300 rounded" />
            <div className="h-8 w-48 bg-gray-300 rounded" />
          </div>
          <div className="h-12 md:h-16 bg-gray-300 rounded w-3/4 mb-6" />
          <div className="h-6 bg-gray-300 rounded w-full mb-2" />
          <div className="h-6 bg-gray-300 rounded w-2/3 mb-8" />
          <div className="flex items-center space-x-4">
            <div className="h-5 w-5 bg-gray-300 rounded" />
            <div className="h-6 w-32 bg-gray-300 rounded" />
          </div>
        </div>
      </div>
    </section>
  );
}
