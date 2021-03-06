import React, { Component } from "react";
import "@nateradebaugh/react-datetime/css/react-datetime.css";

import SimpleExample from "./SimpleExample";
import LocalizationExample from "./LocalizationExample";
import CustomizableExample from "./CustomizableExample";
import OpenExample from "./OpenExample";
import ValidatedExample from "./ValidatedExample";

export default class App extends Component {
  render() {
    return (
      <div>
        <SimpleExample />
        <hr />
        <LocalizationExample />
        <hr />
        <CustomizableExample />
        <hr />
        <OpenExample />
        <hr />
        <ValidatedExample />
        <hr />
      </div>
    );
  }
}
