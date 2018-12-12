import React, { Component } from "react";
import DateTime from "@nateradebaugh/react-datetime";

export default class SimpleExample extends Component {
  render() {
    return (
      <React.Fragment>
        <h2>Simple Scenario</h2>
        <DateTime onChange={console.log} />
      </React.Fragment>
    );
  }
}
