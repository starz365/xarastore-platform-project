const path = require('path');
const webpack = require('webpack');
const CompressionPlugin = require('compression-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const TerserPlugin = require('terser-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const { SubresourceIntegrityPlugin } = require('webpack-subresource-integrity');
const WorkboxWebpackPlugin = require('workbox-webpack-plugin');
const { WebpackManifestPlugin } = require('webpack-manifest-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = (config, { dev, isServer }) => {
  // Customize webpack config for production
  if (!dev && !isServer) {
    // Add custom plugins
    config.plugins.push(
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify('production'),
        'process.env.APP_VERSION': JSON.stringify(process.env.npm_package_version || '1.0.0'),
      }),
      new CompressionPlugin({
        algorithm: 'gzip',
        test: /\.(js|css|html|svg|json)$/,
        threshold: 10240,
        minRatio: 0.8,
        deleteOriginalAssets: false,
      }),
      new CompressionPlugin({
        filename: '[path][base].br',
        algorithm: 'brotliCompress',
        test: /\.(js|css|html|svg|json)$/,
        compressionOptions: { level: 11 },
        threshold: 10240,
        minRatio: 0.8,
        deleteOriginalAssets: false,
      }),
      new SubresourceIntegrityPlugin({
        hashFuncNames: ['sha256', 'sha384'],
        enabled: true,
      }),
      new WorkboxWebpackPlugin.InjectManifest({
        swSrc: path.join(__dirname, 'public/service-worker.js'),
        swDest: 'service-worker.js',
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
        exclude: [
          /\.map$/,
          /^manifest.*\.js$/,
          /_buildManifest\.js$/,
          /_ssgManifest\.js$/,
          /middleware-manifest\.json$/,
        ],
        modifyURLPrefix: {
          '': '/_next/',
        },
      }),
      new WebpackManifestPlugin({
        fileName: 'asset-manifest.json',
        publicPath: '/_next/',
        generate: (seed, files) => {
          const manifestFiles = files.reduce((manifest, file) => {
            if (file.name && !file.name.endsWith('.map')) {
              manifest[file.name] = file.path;
            }
            return manifest;
          }, seed);
          return manifestFiles;
        },
      })
    );

    // Enable bundle analyzer in CI or with env variable
    if (process.env.ANALYZE === 'true') {
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          reportFilename: 'bundle-analysis.html',
          openAnalyzer: false,
          generateStatsFile: true,
          statsFilename: 'webpack-stats.json',
        })
      );
    }

    // Optimize split chunks
    config.optimization = {
      ...config.optimization,
      minimize: true,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            parse: {
              ecma: 2020,
            },
            compress: {
              ecma: 5,
              warnings: false,
              comparisons: false,
              inline: 2,
              drop_console: !dev, // Remove console in production
              drop_debugger: !dev, // Remove debugger in production
            },
            mangle: {
              safari10: true,
            },
            output: {
              ecma: 5,
              comments: false,
              ascii_only: true,
            },
          },
          parallel: true,
        }),
        new CssMinimizerPlugin(),
      ],
      splitChunks: {
        chunks: 'all',
        minSize: 20000,
        maxSize: 244000,
        minChunks: 1,
        maxAsyncRequests: 30,
        maxInitialRequests: 30,
        automaticNameDelimiter: '~',
        enforceSizeThreshold: 50000,
        cacheGroups: {
          defaultVendors: {
            test: /[\\/]node_modules[\\/]/,
            priority: -10,
            reuseExistingChunk: true,
            name(module) {
              const packageName = module.context.match(
                /[\\/]node_modules[\\/](.*?)([\\/]|$)/
              )[1];
              return `vendor.${packageName.replace('@', '')}`;
            },
          },
          default: {
            minChunks: 2,
            priority: -20,
            reuseExistingChunk: true,
          },
          styles: {
            name: 'styles',
            test: /\.(css|scss)$/,
            chunks: 'all',
            enforce: true,
          },
          commons: {
            test: /[\\/]components[\\/]/,
            name: 'commons',
            chunks: 'all',
            minChunks: 2,
          },
          lib: {
            test: /[\\/]lib[\\/]/,
            name: 'lib',
            chunks: 'all',
            minChunks: 2,
          },
          utils: {
            test: /[\\/]utils[\\/]/,
            name: 'utils',
            chunks: 'all',
            minChunks: 2,
          },
          services: {
            test: /[\\/]services[\\/]/,
            name: 'services',
            chunks: 'all',
            minChunks: 2,
          },
        },
      },
      runtimeChunk: {
        name: 'runtime',
      },
    };

    // Configure module rules
    config.module.rules.push({
      test: /\.(png|jpe?g|gif|webp|avif|svg)$/i,
      type: 'asset',
      parser: {
        dataUrlCondition: {
          maxSize: 10 * 1024, // 10kb
        },
      },
      generator: {
        filename: 'static/media/[name].[hash:8][ext]',
      },
    });

    // Add cache groups for better chunking
    config.cache = {
      type: 'filesystem',
      compression: 'gzip',
      cacheDirectory: path.resolve(__dirname, '.next/cache/webpack'),
      buildDependencies: {
        config: [__filename],
      },
    };

    // Performance hints
    config.performance = {
      maxAssetSize: 250000,
      maxEntrypointSize: 250000,
      hints: 'warning',
      assetFilter: function (assetFilename) {
        return !assetFilename.endsWith('.map');
      },
    };

    // Resolve aliases for better tree shaking
    config.resolve.alias = {
      ...config.resolve.alias,
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      'next/image': path.resolve(__dirname, 'node_modules/next/image'),
    };

    // Exclude large dependencies from client bundle
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push(({ context, request }, callback) => {
        if (/^@supabase\//.test(request)) {
          return callback(null, `commonjs ${request}`);
        }
        callback();
      });
    }
  }

  // Development-specific configurations
  if (dev) {
    config.plugins.push(
      new webpack.HotModuleReplacementPlugin(),
      new webpack.NoEmitOnErrorsPlugin()
    );

    // Enable source maps
    config.devtool = 'cheap-module-source-map';
  }

  return config;
};
