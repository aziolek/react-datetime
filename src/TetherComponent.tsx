import React, { Component } from "react";
import ReactDOM from "react-dom";
import Tether from "tether";

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

  constructor(props) {
    super(props);

    // Create a node that we can stick our content Component in
    this._elementParentNode = document.createElement("div");
  }

  componentDidMount() {
    // Create element node container if it hasn't been yet
    this._removeContainer();
  }

  componentDidUpdate() {
    //
    // Update
    //

    // If no element component provided, bail out
    const shouldDestroy =
      !this._elementNode.current || !this._targetNode.current;

    if (shouldDestroy) {
      // Destroy Tether element if it has been created
      this._destroy();
      return;
    }

    //
    // Update Tether
    //
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

    // Append node to the render node
    const renderNode = document.body;
    renderNode!.appendChild(this._elementParentNode!);

    if (this._tetherInstance) {
      this._tetherInstance.setOptions(tetherOptions);
    } else {
      this._tetherInstance = new Tether(tetherOptions);
    }

    this._tetherInstance.position();
  }

  componentWillUnmount() {
    this._destroy();
  }

  _destroy() {
    if (this._tetherInstance) {
      this._tetherInstance.destroy();
      this._tetherInstance = null;
    }

    this._removeContainer();
  }

  _removeContainer() {
    if (this._elementParentNode && this._elementParentNode.parentNode) {
      this._elementParentNode.parentNode.removeChild(this._elementParentNode);

      // The container is created after mounting
      // so we need to force an update to
      // enable tether
      // Cannot move _createContainer into the constructor
      // because of is a side effect: https://reactjs.org/docs/strict-mode.html#detecting-unexpected-side-effects
      this.forceUpdate();
    }
  }

  render() {
    const targetComponent = this.props.renderTarget(this._targetNode);
    const elementComponent = this.props.renderElement(this._elementNode);

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
