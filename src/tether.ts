const TetherBase: any = { modules: [] };

let zeroElement: any = null;

// Same as native getBoundingClientRect, except it takes into account parent <frame> offsets
// if the element lies within a nested document (<frame> or <iframe>-like).
function getActualBoundingClientRect(node: any) {
  const boundingRect = node.getBoundingClientRect();

  // The original object returned by getBoundingClientRect is immutable, so we clone it
  // We can't use extend because the properties are not considered part of the object by hasOwnProperty in IE9
  const rect: any = {};
  for (const k in boundingRect) {
    rect[k] = boundingRect[k];
  }

  if (node.ownerDocument !== document) {
    const frameElement = node.ownerDocument.defaultView.frameElement;
    if (frameElement) {
      const frameRect = getActualBoundingClientRect(frameElement);
      rect.top += frameRect.top;
      rect.bottom += frameRect.top;
      rect.left += frameRect.left;
      rect.right += frameRect.left;
    }
  }

  return rect;
}

function getScrollParents(el: any): any[] {
  // In firefox if the el is inside an iframe with display: none; window.getComputedStyle() will return null;
  // https://bugzilla.mozilla.org/show_bug.cgi?id=548397
  const computedStyle = getComputedStyle(el) || {};
  const position = computedStyle.position;
  const parents: any[] = [];

  if (position === "fixed") {
    return [el];
  }

  let parent = el;
  while ((parent = parent.parentNode) && parent && parent.nodeType === 1) {
    let style: any;
    try {
      style = getComputedStyle(parent);
    } catch (err) {
      // Do nothing
    }

    if (typeof style === "undefined" || style === null) {
      parents.push(parent);
      return parents;
    }

    const { overflow, overflowX, overflowY } = style;
    if (/(auto|scroll|overlay)/.test(overflow + overflowY + overflowX)) {
      if (
        position !== "absolute" ||
        ["relative", "absolute", "fixed"].indexOf(style.position) >= 0
      ) {
        parents.push(parent);
      }
    }
  }

  parents.push(el.ownerDocument.body);

  // If the node is within a frame, account for the parent window scroll
  if (el.ownerDocument !== document) {
    parents.push(el.ownerDocument.defaultView);
  }

  return parents;
}

const uniqueId = (() => {
  let id = 0;
  return () => ++id;
})();

const zeroPosCache: any = {};
const getOrigin = () => {
  // getBoundingClientRect is unfortunately too accurate.  It introduces a pixel or two of
  // jitter as the user scrolls that messes with our ability to detect if two positions
  // are equivilant or not.  We place an element at the top left of the page that will
  // get the same jitter, so we can cancel the two out.
  let node: any = zeroElement;
  if (!node || !document.body.contains(node)) {
    node = document.createElement("div");
    node.setAttribute("data-tether-id", uniqueId());
    (extend as any)(node.style, {
      top: 0,
      left: 0,
      position: "absolute"
    });

    document.body.appendChild(node);

    zeroElement = node;
  }

  const id = node.getAttribute("data-tether-id");
  if (typeof zeroPosCache[id] === "undefined") {
    zeroPosCache[id] = getActualBoundingClientRect(node);

    // Clear the cache when this position call is done
    defer(() => {
      delete zeroPosCache[id];
    });
  }

  return zeroPosCache[id];
};

function removeUtilElements() {
  if (zeroElement) {
    document.body.removeChild(zeroElement);
  }

  zeroElement = null;
}

function getBounds(el: IElement): IRect {
  let doc: Document | null = null;
  if (el === document) {
    doc = document;
    el = document.documentElement;
  } else if (el instanceof Node) {
    doc = el.ownerDocument;
  }

  const box = getActualBoundingClientRect(el);

  const origin = getOrigin();

  box.top -= origin.top;
  box.left -= origin.left;

  if (typeof box.width === "undefined") {
    box.width = document.body.scrollWidth - box.left - box.right;
  }
  if (typeof box.height === "undefined") {
    box.height = document.body.scrollHeight - box.top - box.bottom;
  }

  if (doc && doc.documentElement) {
    const docEl = doc.documentElement;
    box.top = box.top - docEl.clientTop;
    box.left = box.left - docEl.clientLeft;
    box.right = doc.body.clientWidth - box.width - box.left;
    box.bottom = doc.body.clientHeight - box.height - box.top;
  }

  return box;
}

function getOffsetParent(el: HTMLElement) {
  return el.offsetParent || document.documentElement;
}

let _scrollBarSize: ISize | null = null;
function getScrollBarSize() {
  if (_scrollBarSize) {
    return _scrollBarSize;
  }
  const inner = document.createElement("div");
  inner.style.width = "100%";
  inner.style.height = "200px";

  const outer = document.createElement("div");
  (extend as any)(outer.style, {
    position: "absolute",
    top: 0,
    left: 0,
    pointerEvents: "none",
    visibility: "hidden",
    width: "200px",
    height: "150px",
    overflow: "hidden"
  });

  outer.appendChild(inner);

  document.body.appendChild(outer);

  const widthContained = inner.offsetWidth;
  outer.style.overflow = "scroll";
  let widthScroll = inner.offsetWidth;

  if (widthContained === widthScroll) {
    widthScroll = outer.clientWidth;
  }

  document.body.removeChild(outer);

  const width = widthContained - widthScroll;

  _scrollBarSize = { width, height: width };
  return _scrollBarSize;
}

function extend(out = {}): object {
  const args: any[] = [];

  Array.prototype.push.apply(args, arguments);

  args.slice(1).forEach(obj => {
    if (obj) {
      for (const key in obj) {
        if ({}.hasOwnProperty.call(obj, key)) {
          out[key] = obj[key];
        }
      }
    }
  });

  return out;
}

function removeClass(el: Element, name: string) {
  if (typeof el.classList !== "undefined") {
    name.split(" ").forEach(cls => {
      if (cls.trim()) {
        el.classList.remove(cls);
      }
    });
  } else {
    const regex = new RegExp(`(^| )${name.split(" ").join("|")}( |$)`, "gi");
    const className = getClassName(el).replace(regex, " ");
    setClassName(el, className);
  }
}

function addClass(el: Element, name: string) {
  if (typeof el.classList !== "undefined") {
    name.split(" ").forEach(cls => {
      if (cls.trim()) {
        el.classList.add(cls);
      }
    });
  } else {
    removeClass(el, name);
    const cls = getClassName(el) + ` ${name}`;
    setClassName(el, cls);
  }
}

function hasClass(el: Element, name: string): boolean {
  if (typeof el.classList !== "undefined") {
    return el.classList.contains(name);
  }

  const className = getClassName(el);
  return new RegExp(`(^| )${name}( |$)`, "gi").test(className);
}

function getClassName(el: any): string {
  // Can't use just SVGAnimatedString here since nodes within a Frame in IE have
  // completely separately SVGAnimatedString base classes
  if (el.className instanceof el.ownerDocument.defaultView.SVGAnimatedString) {
    return el.className.baseVal;
  }

  return el.className;
}

function setClassName(el: Element, className: string): void {
  el.setAttribute("class", className);
}

function updateClasses(el: Element, add: string[], all: string[]) {
  // Of the set of 'all' classes, we need the 'add' classes, and only the
  // 'add' classes to be set.
  all.forEach(cls => {
    if (add.indexOf(cls) === -1 && hasClass(el, cls)) {
      removeClass(el, cls);
    }
  });

  add.forEach(cls => {
    if (!hasClass(el, cls)) {
      addClass(el, cls);
    }
  });
}

const deferred: string[] = [];

const defer = (fn: any) => {
  deferred.push(fn);
};

const flush = () => {
  let fn: any;
  while ((fn = deferred.pop())) {
    fn();
  }
};

class Evented {
  bindings: object | undefined;
  history: IHistoryItem[];

  on(event: any, handler: any, ctx: any, once = false) {
    if (typeof this.bindings === "undefined") {
      this.bindings = {};
    }
    if (typeof this.bindings[event] === "undefined") {
      this.bindings[event] = [];
    }
    this.bindings[event].push({ handler, ctx, once });
  }

  once(event: any, handler: any, ctx: any) {
    this.on(event, handler, ctx, true);
  }

  off(event: any, handler: any) {
    if (
      typeof this.bindings === "undefined" ||
      typeof this.bindings[event] === "undefined"
    ) {
      return;
    }

    if (typeof handler === "undefined") {
      delete this.bindings[event];
    } else {
      for (let i = 0; i < this.bindings[event].length; ) {
        if (this.bindings[event][i].handler === handler) {
          this.bindings[event].splice(i, 1);
        } else {
          ++i;
        }
      }
    }
  }

  trigger(event: any, ...args: any) {
    if (typeof this.bindings !== "undefined" && this.bindings[event]) {
      for (let i = 0; i < this.bindings[event].length; ) {
        const { handler, ctx, once } = this.bindings[event][i];

        let context = ctx;
        if (typeof context === "undefined") {
          context = this;
        }

        handler.apply(context, args);

        if (once) {
          this.bindings[event].splice(i, 1);
        } else {
          ++i;
        }
      }
    }
  }
}

TetherBase.Utils = {
  getActualBoundingClientRect,
  getScrollParents,
  getBounds,
  getOffsetParent,
  extend,
  addClass,
  removeClass,
  hasClass,
  updateClasses,
  defer,
  flush,
  uniqueId,
  Evented,
  getScrollBarSize,
  removeUtilElements
};

function within(a: number, b: number, diff = 1) {
  return a + diff >= b && b >= a - diff;
}

const transformKey: string | undefined = (() => {
  if (typeof document === "undefined") {
    return "";
  }

  const el = document.createElement("div");
  const transforms = [
    "transform",
    "WebkitTransform",
    "OTransform",
    "MozTransform",
    "msTransform"
  ];
  for (let i = 0; i < transforms.length; ++i) {
    const key = transforms[i];
    if (el.style[key] !== undefined) {
      return key;
    }
  }

  return undefined;
})();

const tethers: TetherClass[] = [];

const position = () => {
  tethers.forEach(tether => {
    tether.position(false);
  });
  flush();
};

function now(): number {
  if (
    typeof performance === "object" &&
    typeof performance.now === "function"
  ) {
    return performance.now();
  }

  return +new Date();
}

(() => {
  let lastCall: number | undefined = undefined;
  let lastDuration: number | undefined = undefined;
  let pendingTimeout: NodeJS.Timeout | null = null;

  const tick = () => {
    if (typeof lastDuration !== "undefined" && lastDuration > 16) {
      // We voluntarily throttle ourselves if we can't manage 60fps
      lastDuration = Math.min(lastDuration - 16, 250);

      // Just in case this is the last event, remember to position just once more
      pendingTimeout = setTimeout(tick, 250);
      return;
    }

    if (typeof lastCall !== "undefined" && now() - lastCall < 10) {
      // Some browsers call events a little too frequently, refuse to run more than is reasonable
      return;
    }

    if (pendingTimeout != null) {
      clearTimeout(pendingTimeout);
      pendingTimeout = null;
    }

    lastCall = now();
    position();
    lastDuration = now() - lastCall;
  };

  if (
    typeof window !== "undefined" &&
    typeof window.addEventListener !== "undefined"
  ) {
    ["resize", "scroll", "touchmove"].forEach(event => {
      window.addEventListener(event, tick);
    });
  }
})();

const MIRROR_LR = {
  center: "center",
  left: "right",
  right: "left"
};

const MIRROR_TB = {
  middle: "middle",
  top: "bottom",
  bottom: "top"
};

const OFFSET_MAP = {
  top: 0,
  left: 0,
  middle: "50%",
  center: "50%",
  bottom: "100%",
  right: "100%"
};

const autoToFixedAttachment = (
  attachment: IParsedAttachment,
  relativeToAttachment: IParsedAttachment
): IParsedAttachment => {
  let { left, top } = attachment;

  if (left === "auto") {
    left = MIRROR_LR[relativeToAttachment.left];
  }

  if (top === "auto") {
    top = MIRROR_TB[relativeToAttachment.top];
  }

  return { left, top };
};

const attachmentToOffset = (attachment: IParsedAttachment): IParsedOffset => {
  let { left, top } = attachment;

  if (typeof OFFSET_MAP[attachment.left] !== "undefined") {
    left = OFFSET_MAP[attachment.left];
  }

  if (typeof OFFSET_MAP[attachment.top] !== "undefined") {
    top = OFFSET_MAP[attachment.top];
  }

  return { left, top };
};

interface INumericOffset {
  top: number;
  left: number;
}

function addOffset(...offsets: IParsedOffset[]): INumericOffset {
  const out = { top: 0, left: 0 };

  offsets.forEach(({ top, left }) => {
    if (typeof top === "string") {
      top = parseFloat(top);
    }

    if (typeof left === "string") {
      left = parseFloat(left);
    }

    out.top += top;
    out.left += left;
  });

  return out;
}

function offsetToPx(offset: IParsedOffset, size: ISize): INumericOffset {
  const numericOffset: INumericOffset = { top: 0, left: 0 };
  if (typeof offset.left === "string" && offset.left.indexOf("%") !== -1) {
    numericOffset.left = (parseFloat(offset.left) / 100) * size.width;
  }

  if (typeof offset.top === "string" && offset.top.indexOf("%") !== -1) {
    numericOffset.top = (parseFloat(offset.top) / 100) * size.height;
  }

  return numericOffset;
}

const parseOffset = (value: IOffset): IParsedOffset => {
  const [top, left] = value.split(" ");
  return { top, left };
};

const parseAttachment = (value: IAttachment): IParsedAttachment => {
  const [top, left] = value.split(" ");
  return { top, left };
};

interface IConstraint {
  to: any;
  pin: true | string[];
  attachment: string;
  outOfBoundsClass: string;
  pinnedClass: string;
}

type IAttachment =
  | "top left"
  | "top center"
  | "top right"
  | "middle left"
  | "middle center"
  | "middle right"
  | "bottom left"
  | "bottom center"
  | "bottom right";

type IOffset = string;
interface IParsedOffset {
  top: string | number;
  left: string | number;
}

interface IParsedAttachment {
  top: string;
  left: string;
}

type IElement = Node | Document | HTMLElement | string | null;

interface IViewPort {
  top: number;
  left: number;
  bottom: number;
  right: number;
}

interface IHistoryItem {
  page: IPage;
  viewport: IViewPort;
  offset?: IParsedOffset;
}

interface IOptimizations {
  moveElement: boolean;
  gpu: boolean;
}

interface IOptions {
  element: IElement;
  target: IElement;
  attachment: IAttachment;
  targetAttachment: IAttachment;
  offset: IOffset;
  targetOffset: IOffset;
  targetModifier: "visible" | "scroll-handle";
  enabled: boolean;
  classes: string[];
  classPrefix: string;
  pinnedClass: string;
  outOfBoundsClass: string;
  optimizations: IOptimizations;
  constraints: IConstraint[];
}

interface IOptionState extends IOptions {
  addTargetClasses: boolean;
  bodyElement: Node;
}

interface ISize {
  width: number;
  height: number;
}

interface IRect extends ISize {
  top: number;
  left: number;
}

interface IPage {
  top: number;
  left: number;
  bottom?: number;
  right?: number;
}

class TetherClass extends Evented {
  element: any;
  target: any;
  targetModifier: any;
  targetAttachment: IParsedAttachment;
  attachment: IParsedAttachment;
  offset: IParsedOffset;
  targetOffset: IParsedOffset;
  scrollParents: any[];
  _cache: object;
  enabled: boolean;
  options: IOptionState;
  _addAttachClasses: string[];
  lastSize: ISize;

  constructor(options: IOptions) {
    super();
    this.position = this.position.bind(this);

    tethers.push(this);

    this.history = [];

    this.setOptions(options, false);

    TetherBase.modules.forEach((module: any) => {
      if (typeof module.initialize !== "undefined") {
        module.initialize.call(this);
      }
    });

    this.position();
  }

  getClass(key = ""): string {
    const { classes } = this.options;
    if (typeof classes !== "undefined" && classes[key]) {
      return this.options.classes[key];
    } else if (this.options.classPrefix) {
      return `${this.options.classPrefix}-${key}`;
    } else {
      return key;
    }
  }

  setOptions(options: IOptions, pos = true) {
    const defaults = {
      offset: "0 0",
      targetOffset: "0 0",
      targetAttachment: "auto auto",
      classPrefix: "tether"
    };

    this.options = (extend as any)(defaults, options);

    const { element, target, targetModifier } = this.options;
    this.element = element;
    this.targetModifier = targetModifier;

    if (typeof target === "string") {
      if (target === "viewport") {
        this.target = document.body;
        this.targetModifier = "visible";
      } else if (target === "scroll-handle") {
        this.target = document.body;
        this.targetModifier = "scroll-handle";
      }
    } else {
      this.target = target;
    }

    ["element", "target"].forEach(key => {
      if (typeof this[key] === "undefined") {
        throw new Error(
          "Tether Error: Both element and target must be defined"
        );
      }

      if (typeof this[key].jquery !== "undefined") {
        this[key] = this[key][0];
      } else if (typeof this[key] === "string") {
        this[key] = document.querySelector(this[key]);
      }
    });

    addClass(this.element, this.getClass("element"));
    if (!(this.options.addTargetClasses === false)) {
      addClass(this.target, this.getClass("target"));
    }

    if (!this.options.attachment) {
      throw new Error("Tether Error: You must provide an attachment");
    }

    this.targetAttachment = parseAttachment(this.options.targetAttachment);
    this.attachment = parseAttachment(this.options.attachment);
    this.offset = parseOffset(this.options.offset);
    this.targetOffset = parseOffset(this.options.targetOffset);

    if (typeof this.scrollParents !== "undefined") {
      this.disable();
    }

    if (this.targetModifier === "scroll-handle") {
      this.scrollParents = [this.target];
    } else {
      this.scrollParents = getScrollParents(this.target);
    }

    if (!(this.options.enabled === false)) {
      this.enable(pos);
    }
  }

  getTargetBounds() {
    if (typeof this.targetModifier !== "undefined") {
      if (this.targetModifier === "visible") {
        if (this.target === document.body) {
          return {
            top: pageYOffset,
            left: pageXOffset,
            height: innerHeight,
            width: innerWidth
          };
        } else {
          const bounds = getBounds(this.target);

          const out = {
            height: bounds.height,
            width: bounds.width,
            top: bounds.top,
            left: bounds.left
          };

          out.height = Math.min(
            out.height,
            bounds.height - (pageYOffset - bounds.top)
          );
          out.height = Math.min(
            out.height,
            bounds.height -
              (bounds.top + bounds.height - (pageYOffset + innerHeight))
          );
          out.height = Math.min(innerHeight, out.height);
          out.height -= 2;

          out.width = Math.min(
            out.width,
            bounds.width - (pageXOffset - bounds.left)
          );
          out.width = Math.min(
            out.width,
            bounds.width -
              (bounds.left + bounds.width - (pageXOffset + innerWidth))
          );
          out.width = Math.min(innerWidth, out.width);
          out.width -= 2;

          if (out.top < pageYOffset) {
            out.top = pageYOffset;
          }
          if (out.left < pageXOffset) {
            out.left = pageXOffset;
          }

          return out;
        }
      } else if (this.targetModifier === "scroll-handle") {
        let bounds: any;
        let target = this.target;
        if (target === document.body) {
          target = document.documentElement;

          bounds = {
            left: pageXOffset,
            top: pageYOffset,
            height: innerHeight,
            width: innerWidth
          };
        } else {
          bounds = getBounds(target);
        }

        const style: any = getComputedStyle(target);

        const hasBottomScroll =
          target.scrollWidth > target.clientWidth ||
          [style.overflow, style.overflowX].indexOf("scroll") >= 0 ||
          this.target !== document.body;

        let scrollBottom = 0;
        if (hasBottomScroll) {
          scrollBottom = 15;
        }

        const height =
          bounds.height -
          parseFloat(style.borderTopWidth) -
          parseFloat(style.borderBottomWidth) -
          scrollBottom;

        const out: any = {
          width: 15,
          height: height * 0.975 * (height / target.scrollHeight),
          left:
            bounds.left + bounds.width - parseFloat(style.borderLeftWidth) - 15
        };

        let fitAdj = 0;
        if (height < 408 && this.target === document.body) {
          fitAdj = -0.00011 * Math.pow(height, 2) - 0.00727 * height + 22.58;
        }

        if (this.target !== document.body) {
          out.height = Math.max(out.height, 24);
        }

        const scrollPercentage =
          this.target.scrollTop / (target.scrollHeight - height);
        out.top =
          scrollPercentage * (height - out.height - fitAdj) +
          bounds.top +
          parseFloat(style.borderTopWidth);

        if (this.target === document.body) {
          out.height = Math.max(out.height, 24);
        }

        return out;
      }
    } else {
      return getBounds(this.target);
    }

    return undefined;
  }

  clearCache() {
    this._cache = {};
  }

  cache(k: any, getter: any) {
    // More than one module will often need the same DOM info, so
    // we keep a cache which is cleared on each position call
    if (typeof this._cache === "undefined") {
      this._cache = {};
    }

    if (typeof this._cache[k] === "undefined") {
      this._cache[k] = getter.call(this);
    }

    return this._cache[k];
  }

  enable(pos = true) {
    if (!(this.options.addTargetClasses === false)) {
      addClass(this.target, this.getClass("enabled"));
    }
    addClass(this.element, this.getClass("enabled"));
    this.enabled = true;

    this.scrollParents.forEach(parent => {
      if (parent !== this.target.ownerDocument) {
        parent.addEventListener("scroll", this.position);
      }
    });

    if (pos) {
      this.position();
    }
  }

  disable() {
    removeClass(this.target, this.getClass("enabled"));
    removeClass(this.element, this.getClass("enabled"));
    this.enabled = false;

    if (typeof this.scrollParents !== "undefined") {
      this.scrollParents.forEach(parent => {
        parent.removeEventListener("scroll", this.position);
      });
    }
  }

  destroy() {
    this.disable();

    tethers.forEach((tether, i) => {
      if (tether === this) {
        tethers.splice(i, 1);
      }
    });

    // Remove any elements we were using for convenience from the DOM
    if (tethers.length === 0) {
      removeUtilElements();
    }
  }

  updateAttachClasses(elementAttach: any, targetAttach: any) {
    elementAttach = elementAttach || this.attachment;
    targetAttach = targetAttach || this.targetAttachment;
    const sides = ["left", "top", "bottom", "right", "middle", "center"];

    if (
      typeof this._addAttachClasses !== "undefined" &&
      this._addAttachClasses.length
    ) {
      // updateAttachClasses can be called more than once in a position call, so
      // we need to clean up after ourselves such that when the last defer gets
      // ran it doesn't add any extra classes from previous calls.
      this._addAttachClasses.splice(0, this._addAttachClasses.length);
    }

    if (typeof this._addAttachClasses === "undefined") {
      this._addAttachClasses = [];
    }
    const add = this._addAttachClasses;

    if (elementAttach.top) {
      add.push(`${this.getClass("element-attached")}-${elementAttach.top}`);
    }
    if (elementAttach.left) {
      add.push(`${this.getClass("element-attached")}-${elementAttach.left}`);
    }
    if (targetAttach.top) {
      add.push(`${this.getClass("target-attached")}-${targetAttach.top}`);
    }
    if (targetAttach.left) {
      add.push(`${this.getClass("target-attached")}-${targetAttach.left}`);
    }

    const all: string[] = [];
    sides.forEach(side => {
      all.push(`${this.getClass("element-attached")}-${side}`);
      all.push(`${this.getClass("target-attached")}-${side}`);
    });

    defer(() => {
      if (!(typeof this._addAttachClasses !== "undefined")) {
        return;
      }

      updateClasses(this.element, this._addAttachClasses, all);
      if (!(this.options.addTargetClasses === false)) {
        updateClasses(this.target, this._addAttachClasses, all);
      }

      delete this._addAttachClasses;
    });
  }

  position(flushChanges = true) {
    // flushChanges commits the changes immediately, leave true unless you are positioning multiple
    // tethers (in which case call Tether.Utils.flush yourself when you're done)

    if (!this.enabled) {
      return undefined;
    }

    this.clearCache();

    // Turn 'auto' attachments into the appropriate corner or edge
    const targetAttachment = autoToFixedAttachment(
      this.targetAttachment,
      this.attachment
    );

    this.updateAttachClasses(this.attachment, targetAttachment);

    const elementPos = this.cache("element-bounds", () => {
      return getBounds(this.element);
    });

    let { width, height } = elementPos;

    if (width === 0 && height === 0 && typeof this.lastSize !== "undefined") {
      // We cache the height and width to make it possible to position elements that are
      // getting hidden.
      ({ width, height } = this.lastSize);
    } else {
      this.lastSize = { width, height };
    }

    const targetPos = this.cache("target-bounds", () => {
      return this.getTargetBounds();
    });
    const targetSize = targetPos;

    // Get an actual px offset from the attachment
    let offset = offsetToPx(attachmentToOffset(this.attachment), {
      width,
      height
    });
    let targetOffset = offsetToPx(
      attachmentToOffset(targetAttachment),
      targetSize
    );

    const manualOffset = offsetToPx(this.offset, { width, height });
    const manualTargetOffset = offsetToPx(this.targetOffset, targetSize);

    // Add the manually provided offset
    offset = addOffset(offset, manualOffset);
    targetOffset = addOffset(targetOffset, manualTargetOffset);

    // It's now our goal to make (element position + offset) == (target position + target offset)
    let left = targetPos.left + targetOffset.left - offset.left;
    let top = targetPos.top + targetOffset.top - offset.top;

    let scrollbarSize: any;
    for (let i = 0; i < TetherBase.modules.length; ++i) {
      const module = TetherBase.modules[i];
      const ret = module.position.call(this, {
        left,
        top,
        targetAttachment,
        targetPos,
        elementPos,
        offset,
        targetOffset,
        manualOffset,
        manualTargetOffset,
        scrollbarSize,
        attachment: this.attachment
      });

      if (ret === false) {
        return false;
      } else if (typeof ret === "undefined" || typeof ret !== "object") {
        continue;
      } else {
        ({ top, left } = ret);
      }
    }

    // We describe the position three different ways to give the optimizer
    // a chance to decide the best possible way to position the element
    // with the fewest repaints.
    const next: IHistoryItem = {
      // Its position relative to the page (absolute positioning when
      // the element is a child of the body)
      page: {
        top: top,
        left: left
      },

      // It's position relative to the viewport (fixed positioning)
      viewport: {
        top: top - pageYOffset,
        bottom: pageYOffset - top - height + innerHeight,
        left: left - pageXOffset,
        right: pageXOffset - left - width + innerWidth
      }
    };

    var doc = this.target.ownerDocument;
    var win = doc.defaultView;

    if (win.innerHeight > doc.documentElement.clientHeight) {
      scrollbarSize = this.cache("scrollbar-size", getScrollBarSize);
      next.viewport.bottom -= scrollbarSize.height;
    }

    if (win.innerWidth > doc.documentElement.clientWidth) {
      scrollbarSize = this.cache("scrollbar-size", getScrollBarSize);
      next.viewport.right -= scrollbarSize.width;
    }

    if (
      next.page &&
      (["", "static"].indexOf(doc.body.style.position) === -1 ||
        ["", "static"].indexOf(doc.body.parentElement.style.position) === -1)
    ) {
      // Absolute positioning in the body will be relative to the page, not the 'initial containing block'
      next.page.bottom = doc.body.scrollHeight - top - height;
      next.page.right = doc.body.scrollWidth - left - width;
    }

    if (
      typeof this.options.optimizations !== "undefined" &&
      this.options.optimizations.moveElement !== false &&
      !(typeof this.targetModifier !== "undefined")
    ) {
      const offsetParent = this.cache("target-offsetparent", () =>
        getOffsetParent(this.target)
      );
      const offsetPosition = this.cache("target-offsetparent-bounds", () =>
        getBounds(offsetParent)
      );
      const offsetParentStyle = getComputedStyle(offsetParent);
      const offsetParentSize = offsetPosition;

      const offsetBorder = {
        top: offsetParentStyle.borderTopWidth
          ? parseFloat(offsetParentStyle.borderTopWidth)
          : 0,
        left: offsetParentStyle.borderLeftWidth
          ? parseFloat(offsetParentStyle.borderLeftWidth)
          : 0,
        bottom: offsetParentStyle.borderBottomWidth
          ? parseFloat(offsetParentStyle.borderBottomWidth)
          : 0,
        right: offsetParentStyle.borderRightWidth
          ? parseFloat(offsetParentStyle.borderRightWidth)
          : 0
      };

      offsetPosition.right =
        doc.body.scrollWidth -
        offsetPosition.left -
        offsetParentSize.width +
        offsetBorder.right;
      offsetPosition.bottom =
        doc.body.scrollHeight -
        offsetPosition.top -
        offsetParentSize.height +
        offsetBorder.bottom;

      if (
        next.page &&
        next.page.top >= offsetPosition.top + offsetBorder.top &&
        next.page.bottom &&
        next.page.bottom >= offsetPosition.bottom
      ) {
        if (
          next.page.left >= offsetPosition.left + offsetBorder.left &&
          next.page.right &&
          next.page.right >= offsetPosition.right
        ) {
          // We're within the visible part of the target's scroll parent
          const scrollTop = offsetParent.scrollTop;
          const scrollLeft = offsetParent.scrollLeft;

          // It's position relative to the target's offset parent (absolute positioning when
          // the element is moved to be a child of the target's offset parent).
          next.offset = {
            top:
              next.page.top - offsetPosition.top + scrollTop - offsetBorder.top,
            left:
              next.page.left -
              offsetPosition.left +
              scrollLeft -
              offsetBorder.left
          };
        }
      }
    }

    // We could also travel up the DOM and try each containing context, rather than only
    // looking at the body, but we're gonna get diminishing returns.

    this.move(next);

    this.history.unshift(next);

    if (this.history.length > 3) {
      this.history.pop();
    }

    if (flushChanges) {
      flush();
    }

    return true;
  }

  // THE ISSUE
  move(pos: IHistoryItem) {
    if (typeof this.element.parentNode === "undefined") {
      return;
    }

    const same: IHistoryItem = { ...pos };
    for (const type in pos) {
      same[type] = {};

      for (const key in pos[type]) {
        let found = false;

        for (const point in this.history) {
          if (
            typeof point[type] !== "undefined" &&
            !within(point[type][key], pos[type][key])
          ) {
            found = true;
            break;
          }
        }

        if (!found) {
          same[type][key] = true;
        }
      }
    }

    interface ITranscribeCss {
      top: string | 0;
      left: string | 0;
      right: string | 0;
      bottom: string | 0;
      position: "" | "fixed" | "absolute";
    }

    const css: ITranscribeCss = {
      top: "",
      left: "",
      right: "",
      bottom: "",
      position: ""
    };

    interface ITranscribeSame {
      top: any;
      left: any;
    }
    interface ITranscribePos {
      top: any;
      left: any;
      bottom?: any;
      right?: any;
    }
    const transcribe = (_same: ITranscribeSame, _pos: ITranscribePos) => {
      const hasOptimizations =
        typeof this.options.optimizations !== "undefined";
      const gpu = hasOptimizations ? this.options.optimizations.gpu : null;
      if (gpu !== false) {
        let yPos: number;
        let xPos: number;
        if (_same.top) {
          css.top = 0;
          yPos = _pos.top;
        } else {
          css.bottom = 0;
          yPos = -(_pos.bottom || 0);
        }

        if (_same.left) {
          css.left = 0;
          xPos = _pos.left;
        } else {
          css.right = 0;
          xPos = -(_pos.right || 0);
        }

        if (window.matchMedia) {
          // HubSpot/tether#207
          const retina =
            window.matchMedia("only screen and (min-resolution: 1.3dppx)")
              .matches ||
            window.matchMedia(
              "only screen and (-webkit-min-device-pixel-ratio: 1.3)"
            ).matches;
          if (!retina) {
            xPos = Math.round(xPos);
            yPos = Math.round(yPos);
          }
        }

        if (transformKey) {
          css[transformKey] = `translateX(${xPos}px) translateY(${yPos}px)`;

          if (transformKey !== "msTransform") {
            // The Z transform will keep this in the GPU (faster, and prevents artifacts),
            // but IE9 doesn't support 3d transforms and will choke.
            css[transformKey] += " translateZ(0)";
          }
        }
      } else {
        if (_same.top) {
          css.top = `${_pos.top}px`;
        } else {
          css.bottom = `${_pos.bottom}px`;
        }

        if (_same.left) {
          css.left = `${_pos.left}px`;
        } else {
          css.right = `${_pos.right}px`;
        }
      }
    };

    let moved = false;
    if (
      same.page &&
      (same.page.top || same.page.bottom) &&
      (same.page.left || same.page.right)
    ) {
      css.position = "absolute";
      transcribe(same.page, pos.page);
    } else if (
      (same.viewport.top || same.viewport.bottom) &&
      (same.viewport.left || same.viewport.right)
    ) {
      css.position = "fixed";
      transcribe(same.viewport, pos.viewport);
    } else if (
      typeof same.offset !== "undefined" &&
      same.offset.top &&
      same.offset.left
    ) {
      css.position = "absolute";
      const offsetParent = this.cache("target-offsetparent", () =>
        getOffsetParent(this.target)
      );

      if (getOffsetParent(this.element) !== offsetParent) {
        defer(() => {
          this.element.parentNode.removeChild(this.element);
          offsetParent.appendChild(this.element);
        });
      }

      transcribe(same.offset, pos.offset!);
      moved = true;
    } else {
      css.position = "absolute";
      transcribe({ top: true, left: true }, pos.page);
    }

    if (!moved) {
      if (this.options.bodyElement) {
        if (this.element.parentNode !== this.options.bodyElement) {
          this.options.bodyElement.appendChild(this.element);
        }
      } else {
        let offsetParentIsBody = true;
        const isFullscreenElement = (e: Node) => {
          const d: any | null = e.ownerDocument;
          if (!d) {
            return false;
          }

          const fe =
            d.fullscreenElement ||
            d.webkitFullscreenElement ||
            d.mozFullScreenElement ||
            d.msFullscreenElement;
          return fe === e;
        };
        let currentNode = this.element.parentNode;
        while (
          currentNode &&
          currentNode.nodeType === 1 &&
          currentNode.tagName !== "BODY" &&
          !isFullscreenElement(currentNode)
        ) {
          if (getComputedStyle(currentNode).position !== "static") {
            offsetParentIsBody = false;
            break;
          }

          currentNode = currentNode.parentNode;
        }

        if (!offsetParentIsBody) {
          this.element.parentNode.removeChild(this.element);
          this.element.ownerDocument.body.appendChild(this.element);
        }
      }
    }

    // Any css change will trigger a repaint, so let's avoid one if nothing changed
    const writeCSS: object = {};
    let write = false;
    for (const key in css) {
      const val = css[key];
      const elVal = this.element.style[key];

      if (elVal !== val) {
        write = true;
        writeCSS[key] = val;
      }
    }

    if (write) {
      defer(() => {
        (extend as any)(this.element.style, writeCSS);
        this.trigger("repositioned");
      });
    }
  }
}

(TetherClass as any).modules = [];

TetherBase.position = position;

const BOUNDS_FORMAT = ["left", "top", "right", "bottom"];

function getBoundingRect(
  tether: TetherClass,
  to: string | Document | HTMLElement | number[]
) {
  if (to === "scrollParent") {
    to = tether.scrollParents[0];
  } else if (to === "window") {
    to = [
      pageXOffset,
      pageYOffset,
      innerWidth + pageXOffset,
      innerHeight + pageYOffset
    ];
  }

  if (to === document && document.documentElement) {
    to = document.documentElement;
  }

  if (to instanceof Element && typeof to.nodeType !== "undefined") {
    const node = to;
    const size = getBounds(to);
    const pos = size;
    const style = getComputedStyle(to);

    to = [pos.left, pos.top, size.width + pos.left, size.height + pos.top];

    // Account any parent Frames scroll offset
    if (node.ownerDocument && node.ownerDocument !== document) {
      const win = node.ownerDocument.defaultView;
      if (win) {
        to[0] += win.pageXOffset;
        to[1] += win.pageYOffset;
        to[2] += win.pageXOffset;
        to[3] += win.pageYOffset;
      }
    }

    BOUNDS_FORMAT.forEach((side, i) => {
      side = side[0].toUpperCase() + side.substr(1);
      if (side === "Top" || side === "Left") {
        to[i] += parseFloat(style[`border${side}Width`]);
      } else {
        to[i] -= parseFloat(style[`border${side}Width`]);
      }
    });
  }

  return to;
}

TetherBase.modules.push({
  position({ top, left, targetAttachment }: any) {
    if (!this.options.constraints) {
      return true;
    }

    let { height, width } = this.cache("element-bounds", () => {
      return getBounds(this.element);
    });

    if (width === 0 && height === 0 && typeof this.lastSize !== "undefined") {
      // Handle the item getting hidden as a result of our positioning without glitching
      // the classes in and out
      ({ width, height } = this.lastSize);
    }

    const targetSize = this.cache("target-bounds", () => {
      return this.getTargetBounds();
    });

    const { height: targetHeight, width: targetWidth } = targetSize;

    const allClasses = [
      this.getClass("pinned"),
      this.getClass("out-of-bounds")
    ];

    this.options.constraints.forEach(constraint => {
      const { outOfBoundsClass, pinnedClass } = constraint;
      if (outOfBoundsClass) {
        allClasses.push(outOfBoundsClass);
      }

      if (pinnedClass) {
        allClasses.push(pinnedClass);
      }
    });

    allClasses.forEach(cls => {
      ["left", "top", "right", "bottom"].forEach(side => {
        allClasses.push(`${cls}-${side}`);
      });
    });

    const addClasses: string[] = [];

    const tAttachment = (extend as any)({}, targetAttachment);
    const eAttachment = (extend as any)({}, this.attachment);

    this.options.constraints.forEach(constraint => {
      let { attachment, pin } = constraint;
      const { to } = constraint;

      if (typeof attachment === "undefined") {
        attachment = "";
      }

      let changeAttachX: string;
      let changeAttachY: string;
      if (attachment.indexOf(" ") >= 0) {
        [changeAttachY, changeAttachX] = attachment.split(" ");
      } else {
        changeAttachX = changeAttachY = attachment;
      }

      const bounds = getBoundingRect(this, to);

      if (changeAttachY === "target" || changeAttachY === "both") {
        if (top < bounds[1] && tAttachment.top === "top") {
          top += targetHeight;
          tAttachment.top = "bottom";
        }

        if (top + height > bounds[3] && tAttachment.top === "bottom") {
          top -= targetHeight;
          tAttachment.top = "top";
        }
      }

      if (changeAttachY === "together") {
        if (tAttachment.top === "top") {
          if (eAttachment.top === "bottom" && top < bounds[1]) {
            top += targetHeight;
            tAttachment.top = "bottom";

            top += height;
            eAttachment.top = "top";
          } else if (
            eAttachment.top === "top" &&
            top + height > bounds[3] &&
            top - (height - targetHeight) >= bounds[1]
          ) {
            top -= height - targetHeight;
            tAttachment.top = "bottom";

            eAttachment.top = "bottom";
          }
        }

        if (tAttachment.top === "bottom") {
          if (eAttachment.top === "top" && top + height > bounds[3]) {
            top -= targetHeight;
            tAttachment.top = "top";

            top -= height;
            eAttachment.top = "bottom";
          } else if (
            eAttachment.top === "bottom" &&
            top < bounds[1] &&
            top + (height * 2 - targetHeight) <= bounds[3]
          ) {
            top += height - targetHeight;
            tAttachment.top = "top";

            eAttachment.top = "top";
          }
        }

        if (tAttachment.top === "middle") {
          if (top + height > bounds[3] && eAttachment.top === "top") {
            top -= height;
            eAttachment.top = "bottom";
          } else if (top < bounds[1] && eAttachment.top === "bottom") {
            top += height;
            eAttachment.top = "top";
          }
        }
      }

      if (changeAttachX === "target" || changeAttachX === "both") {
        if (left < bounds[0] && tAttachment.left === "left") {
          left += targetWidth;
          tAttachment.left = "right";
        }

        if (left + width > bounds[2] && tAttachment.left === "right") {
          left -= targetWidth;
          tAttachment.left = "left";
        }
      }

      if (changeAttachX === "together") {
        if (left < bounds[0] && tAttachment.left === "left") {
          if (eAttachment.left === "right") {
            left += targetWidth;
            tAttachment.left = "right";

            left += width;
            eAttachment.left = "left";
          } else if (eAttachment.left === "left") {
            left += targetWidth;
            tAttachment.left = "right";

            left -= width;
            eAttachment.left = "right";
          }
        } else if (left + width > bounds[2] && tAttachment.left === "right") {
          if (eAttachment.left === "left") {
            left -= targetWidth;
            tAttachment.left = "left";

            left -= width;
            eAttachment.left = "right";
          } else if (eAttachment.left === "right") {
            left -= targetWidth;
            tAttachment.left = "left";

            left += width;
            eAttachment.left = "left";
          }
        } else if (tAttachment.left === "center") {
          if (left + width > bounds[2] && eAttachment.left === "left") {
            left -= width;
            eAttachment.left = "right";
          } else if (left < bounds[0] && eAttachment.left === "right") {
            left += width;
            eAttachment.left = "left";
          }
        }
      }

      if (changeAttachY === "element" || changeAttachY === "both") {
        if (top < bounds[1] && eAttachment.top === "bottom") {
          top += height;
          eAttachment.top = "top";
        }

        if (top + height > bounds[3] && eAttachment.top === "top") {
          top -= height;
          eAttachment.top = "bottom";
        }
      }

      if (changeAttachX === "element" || changeAttachX === "both") {
        if (left < bounds[0]) {
          if (eAttachment.left === "right") {
            left += width;
            eAttachment.left = "left";
          } else if (eAttachment.left === "center") {
            left += width / 2;
            eAttachment.left = "left";
          }
        }

        if (left + width > bounds[2]) {
          if (eAttachment.left === "left") {
            left -= width;
            eAttachment.left = "right";
          } else if (eAttachment.left === "center") {
            left -= width / 2;
            eAttachment.left = "right";
          }
        }
      }

      if (typeof pin === "string") {
        pin = pin.split(",").map(p => p.trim());
      } else if (pin === true) {
        pin = ["top", "left", "right", "bottom"];
      }

      pin = pin || [];

      const pinned: string[] = [];
      const oob: string[] = [];

      if (top < bounds[1]) {
        if (pin.indexOf("top") >= 0) {
          top = bounds[1];
          pinned.push("top");
        } else {
          oob.push("top");
        }
      }

      if (top + height > bounds[3]) {
        if (pin.indexOf("bottom") >= 0) {
          top = bounds[3] - height;
          pinned.push("bottom");
        } else {
          oob.push("bottom");
        }
      }

      if (left < bounds[0]) {
        if (pin.indexOf("left") >= 0) {
          left = bounds[0];
          pinned.push("left");
        } else {
          oob.push("left");
        }
      }

      if (left + width > bounds[2]) {
        if (pin.indexOf("right") >= 0) {
          left = bounds[2] - width;
          pinned.push("right");
        } else {
          oob.push("right");
        }
      }

      if (pinned.length) {
        let pinnedClass: string;
        if (typeof this.options.pinnedClass !== "undefined") {
          pinnedClass = this.options.pinnedClass;
        } else {
          pinnedClass = this.getClass("pinned");
        }

        addClasses.push(pinnedClass);
        pinned.forEach(side => {
          addClasses.push(`${pinnedClass}-${side}`);
        });
      }

      if (oob.length) {
        let oobClass: string;
        if (typeof this.options.outOfBoundsClass !== "undefined") {
          oobClass = this.options.outOfBoundsClass;
        } else {
          oobClass = this.getClass("out-of-bounds");
        }

        addClasses.push(oobClass);
        oob.forEach(side => {
          addClasses.push(`${oobClass}-${side}`);
        });
      }

      if (pinned.indexOf("left") >= 0 || pinned.indexOf("right") >= 0) {
        eAttachment.left = tAttachment.left = false;
      }
      if (pinned.indexOf("top") >= 0 || pinned.indexOf("bottom") >= 0) {
        eAttachment.top = tAttachment.top = false;
      }

      if (
        tAttachment.top !== targetAttachment.top ||
        tAttachment.left !== targetAttachment.left ||
        eAttachment.top !== this.attachment.top ||
        eAttachment.left !== this.attachment.left
      ) {
        this.updateAttachClasses(eAttachment, tAttachment);
        this.trigger("update", {
          attachment: eAttachment,
          targetAttachment: tAttachment
        });
      }
    });

    defer(() => {
      if (!(this.options.addTargetClasses === false)) {
        updateClasses(this.target, addClasses, allClasses);
      }
      updateClasses(this.element, addClasses, allClasses);
    });

    return { top, left };
  }
});

TetherBase.modules.push({
  position({ top, left }: any) {
    const { height, width } = this.cache("element-bounds", () => {
      return getBounds(this.element);
    });

    const targetPos = this.getTargetBounds();

    const bottom = top + height;
    const right = left + width;

    const abutted: string[] = [];
    if (top <= targetPos.bottom && bottom >= targetPos.top) {
      ["left", "right"].forEach(side => {
        const targetPosSide = targetPos[side];
        if (targetPosSide === left || targetPosSide === right) {
          abutted.push(side);
        }
      });
    }

    if (left <= targetPos.right && right >= targetPos.left) {
      ["top", "bottom"].forEach(side => {
        const targetPosSide = targetPos[side];
        if (targetPosSide === top || targetPosSide === bottom) {
          abutted.push(side);
        }
      });
    }

    const allClasses: string[] = [];
    const addClasses: string[] = [];

    const sides = ["left", "top", "right", "bottom"];
    allClasses.push(this.getClass("abutted"));
    sides.forEach(side => {
      allClasses.push(`${this.getClass("abutted")}-${side}`);
    });

    if (abutted.length) {
      addClasses.push(this.getClass("abutted"));
    }

    abutted.forEach(side => {
      addClasses.push(`${this.getClass("abutted")}-${side}`);
    });

    defer(() => {
      if (!(this.options.addTargetClasses === false)) {
        updateClasses(this.target, addClasses, allClasses);
      }
      updateClasses(this.element, addClasses, allClasses);
    });

    return true;
  }
});

TetherBase.modules.push({
  position({ top, left }: any) {
    if (!this.options.shift) {
      return undefined;
    }

    let shift = this.options.shift;
    if (typeof this.options.shift === "function") {
      shift = this.options.shift.call(this, { top, left });
    }

    let shiftTop: number;
    let shiftLeft: number;
    if (typeof shift === "string") {
      shift = shift.split(" ");
      shift[1] = shift[1] || shift[0];

      const [shiftTopStr, shiftLeftStr] = shift;

      shiftTop = parseFloat(shiftTopStr);
      shiftLeft = parseFloat(shiftLeftStr);
    } else {
      [shiftTop, shiftLeft] = [shift.top, shift.left];
    }

    top += shiftTop;
    left += shiftLeft;

    return { top, left };
  }
});

const Tether = (extend as any)(TetherClass, TetherBase);

export default Tether;
