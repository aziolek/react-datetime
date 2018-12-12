import React, { Component, isValidElement } from "react";
import ReactDOM from "react-dom";
import Tether from "tether";

if (!Tether) {
  console.error(
    "It looks like Tether has not been included. Please load this dependency first https://github.com/HubSpot/tether"
  );
}

interface TetherComponentProps {
  renderTarget: any;
  renderElement: any;
}

class TetherComponent extends Component<TetherComponentProps, never> {
  // The DOM node of the target, obtained using ref in the render prop
  _targetNode = React.createRef();

  // The DOM node of the element, obtained using ref in the render prop
  _elementNode = React.createRef();

  _elementParentNode: Node | null = null;

  _tetherInstance: Tether | null = null;

  componentDidMount() {
    this._createContainer();
    // The container is created after mounting
    // so we need to force an update to
    // enable tether
    // Cannot move _createContainer into the constructor
    // because of is a side effect: https://reactjs.org/docs/strict-mode.html#detecting-unexpected-side-effects
    this.forceUpdate();
  }

  componentDidUpdate(prevProps) {
    this._update();
  }

  componentWillUnmount() {
    this._destroy();
  }

  _runRenders() {
    // To obtain the components, we run the render functions and pass in the ref
    // Later, when the component is mounted, the ref functions will be called
    // and trigger a tether update
    let targetComponent =
      typeof this.props.renderTarget === "function"
        ? this.props.renderTarget(this._targetNode)
        : null;
    let elementComponent =
      typeof this.props.renderElement === "function"
        ? this.props.renderElement(this._elementNode)
        : null;

    // Check if what has been returned is a valid react element
    if (!isValidElement(targetComponent)) {
      targetComponent = null;
    }
    if (!isValidElement(elementComponent)) {
      elementComponent = null;
    }

    return {
      targetComponent,
      elementComponent
    };
  }

  _createTetherInstance(tetherOptions) {
    if (this._tetherInstance) {
      this._destroy();
    }

    this._tetherInstance = new Tether(tetherOptions);
  }

  _destroyTetherInstance() {
    if (this._tetherInstance) {
      this._tetherInstance.destroy();

      this._tetherInstance = null;
    }
  }

  get _renderNode() {
    //const { renderElementTo } = this.props;
    //if (typeof renderElementTo === "string") {
    //  return document.querySelector(renderElementTo);
    //}

    //return renderElementTo || document.body;
    return document.body;
  }

  _destroy() {
    this._destroyTetherInstance();
    this._removeContainer();
  }

  _createContainer() {
    // Create element node container if it hasn't been yet
    this._removeContainer();

    // Create a node that we can stick our content Component in
    this._elementParentNode = document.createElement("div");
  }

  _addContainerToDOM() {
    // Append node to the render node
    this._renderNode!.appendChild(this._elementParentNode!);
  }

  _removeContainer() {
    if (this._elementParentNode && this._elementParentNode.parentNode) {
      this._elementParentNode.parentNode.removeChild(this._elementParentNode);
    }
  }

  _update() {
    // If no element component provided, bail out
    const shouldDestroy =
      !this._elementNode.current || !this._targetNode.current;

    if (shouldDestroy) {
      // Destroy Tether element if it has been created
      this._destroy();
      return;
    }

    this._updateTether();
  }

  _updateTether() {
    const tetherOptions = {
      target: this._targetNode.current,
      element: this._elementParentNode,
      attachment: "top left",
      targetAttachment: "bottom left",
      constraints: [
        {
          to: "scrollParent",
          attachment: "together both"
        }
      ]
    };

    this._addContainerToDOM();

    if (this._tetherInstance) {
      this._tetherInstance.setOptions(tetherOptions);
    } else {
      this._createTetherInstance(tetherOptions);
    }

    this._tetherInstance!.position();
  }

  render() {
    const { targetComponent, elementComponent } = this._runRenders();

    if (!targetComponent || !this._elementParentNode) {
      return null;
    }

    return (
      <React.Fragment>
        {targetComponent}
        {elementComponent &&
          ReactDOM.createPortal(elementComponent, this._elementParentNode)}
      </React.Fragment>
    );
  }
}

export default TetherComponent;
