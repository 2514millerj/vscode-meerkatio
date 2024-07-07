// Getter and setters for extension context to avoid passing the context variable across the codebase

let extensionContext = null;

module.exports.setExtensionContext = function (context) {
  extensionContext = context;
}

module.exports.getExtensionContext = function () {
  if (!extensionContext) {
    throw new Error("Extension context not set");
  }
  return extensionContext;
}