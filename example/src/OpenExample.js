import React, { Component } from "react";
import DateTime from "@nateradebaugh/react-datetime";

export default class OpenExample extends Component {
  constructor(props) {
    super(props);

    this.state = {
      viewMode: undefined
    };

    // Bind functions
    this.renderButton = this.renderButton.bind(this);
  }

  renderButton(text, viewMode) {
    return (
      <button
        type="button"
        onClick={() => this.setState({ viewMode: viewMode })}
        disabled={this.state.viewMode === viewMode}
      >
        {text}
      </button>
    );
  }

  render() {
    return (
      <React.Fragment>
        <h2>open</h2>
        <p>
          The "open" prop is only consumed when the component is mounted. Useful
          for embedding inside your own popover components.
        </p>
        <p>Try out various viewModes and see how they affect the component.</p>
        <p>
          {this.renderButton("Default - undefined", undefined)}
          {this.renderButton("Years", "years")}
          {this.renderButton("Months", "months")}
          {this.renderButton("Days", "days")}
          {this.renderButton("Time", "time")}
        </p>

        <DateTime
          open
          input={false}
          onChange={console.log}
          viewMode={this.state.viewMode}
        />
      </React.Fragment>
    );
  }
}
