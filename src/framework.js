const http = require('http');
const webpack = require('webpack');
const dev = require('webpack-dev-middleware');
const hot = require('webpack-hot-middleware');

function createAndStartDevServer(getApp, options) {
  const server = http.createServer(function (req, res, next) {
    getApp()(req, res, next);
  });
  server.listen(options.port, options.host, function () {
    const port = server.address().port;
    const host = server.address().address;
    console.log(`Development server started at http://${host}:${port}`);
  });
}

function createWebpackCompiler(config) {
    config.entry['webpack_hm_client'] = `webpack-hot-middleware/client?path=${config.output.publicPath}__webpack_hmr`;
  if (typeof config.plugins === 'undefined') {
      config.plugins = [];
  }
  config.plugins['webpack_hmr_plugin'] = new webpack.HotModuleReplacementPlugin();
  return webpack(config);
}

const enableHotReload = (function () {
    let compiler;
    let devMiddleware;
    let hotMiddleware;

  return function (app, config, options) {
    // create once and reuse to keep socket connections
    if (!compiler) {
        compiler = createWebpackCompiler(config);
    }
    if (!devMiddleware) {
        devMiddleware = dev(compiler, {
            noInfo: true,
            publicPath: config.output.publicPath
        });
    }
    app.use(devMiddleware);

    if (options.react) {
      if (!hotMiddleware) {
          hotMiddleware = hot(compiler);
      }
      app.use(hotMiddleware);
    }
  };
})();

function reloadApplication(serverCode, config, options) {
  // we can't just re-import as not sure what module systems used
  // eval works for all the module systems.
  const reloadedApp = eval(serverCode);

  // we got new app, need to hot reload again
  enableHotReload(reloadedApp, config, options);

  return reloadedApp;
}

// app will try to create server again - intercept EADDRINUSE error and ignore it, otherwise rethrow
function ignoreServerRecreated() {
  process.on('uncaughtException', function (e) {
    if (e.code !== 'EADDRINUSE' || e.syscall !== 'listen' || e.address !== '127.0.0.1' || e.port !== 1337) {
      console.log(e);
    }
  });
}

exports.createAndStartDevServer = createAndStartDevServer;
exports.reloadApplication = reloadApplication;
exports.createWebpackCompiler = createWebpackCompiler;
exports.enableHotReload = enableHotReload;
exports.ignoreServerRecreated = ignoreServerRecreated;
