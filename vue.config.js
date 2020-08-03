module.exports = {
  // publicPath: '/pose-mobilenet/',
  chainWebpack: config => {
    config.module.rules.delete('images')
    config.module
      .rule('images')
        .test(/\.(png|jpe?g|gif)(\?.*)?$/)
        .use('url-loader')
          .loader('url-loader')
          .options({
            // You options here, default options:
            limit: 100,
            // name: `assets/img/[name].[hash:8].[ext]`
          })
  }
}