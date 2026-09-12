// jsdom provides no canvas 2d context — stub it with a no-op object
// so Canvas.draw()/onResize() can run in tests.
HTMLCanvasElement.prototype.getContext = () =>
  new Proxy(
    {},
    {
      get: () => () => {},
      set: () => true,
    }
  );
