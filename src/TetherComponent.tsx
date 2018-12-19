import React, { Component } from "react";
import Tether from "./tether";

interface TetherComponentProps {
  renderTarget: any;
  renderElement: any;
}

class TetherComponent extends Component<TetherComponentProps, never> {
  // The DOM node of the target, obtained using ref in the render prop
  targetNode = React.createRef();

  // The DOM node of the element, obtained using ref in the render prop
  elementNode = React.createRef();

  wrapperNode = React.createRef<any>();

  tetherInstance: Tether | null = null;

  componentDidUpdate() {
    this.tryDestroy();

    const nodesExist = this.elementNode.current && this.targetNode.current;
    if (!nodesExist) {
      return;
    }

    this.tetherInstance = new Tether({
      target: this.targetNode.current,
      element: this.wrapperNode.current,
      attachment: "top left",
      targetAttachment: "bottom left",
      constraints: [
        {
          to: "scrollParent",
          attachment: "together both"
        }
      ]
    });
    this.tetherInstance.position();
  }

  componentWillUnmount() {
    this.tryDestroy();
  }

  tryDestroy() {
    if (this.tetherInstance) {
      this.tetherInstance.destroy();
      this.tetherInstance = null;
    }
  }

  render() {
    return (
      <React.Fragment>
        {this.props.renderTarget(this.targetNode)}
        <div ref={this.wrapperNode}>
          {this.props.renderElement(this.elementNode)}
        </div>
      </React.Fragment>
    );
  }
}

export default TetherComponent;
