import * as React from "react";
import getYear from "date-fns/get_year";
import setYear from "date-fns/set_year";
import getDaysInYear from "date-fns/get_days_in_year";
import setDayOfYear from "date-fns/set_day_of_year";
import cc from "classcat";
import noop from "./noop";
import { IsValidDateFunc, SetDateFunc, UpdateSelectedDateFunc } from ".";
import returnTrue from "./returnTrue";

interface YearsViewProps {
  viewDate: Date;
  moveTime?: any;
  showView?: any;
  selectedDate?: Date;

  /*
  Define the dates that can be selected. The function receives (currentDate, selectedDate)
  and should return a true or false whether the currentDate is valid or not. See selectable dates.
  */
  isValidDate?: IsValidDateFunc;

  /*
  Customize the way that the years are shown in the year picker.
  The accepted function has the selectedDate, the current date and the default calculated
  props for the cell, the year to be shown, and must return a React component.
  See appearance customization
  */
  renderYear?: (props: any, year: number, selectedDate?: Date) => JSX.Element;

  updateOn: string;

  setDate: SetDateFunc;

  updateSelectedDate: UpdateSelectedDateFunc;
}

class YearsView extends React.Component<YearsViewProps, never> {
  static defaultProps = {
    viewDate: new Date(),
    moveTime: noop,
    showView: noop,
    updateOn: noop,
    setDate: noop,
    updateSelectedDate: noop
  };

  constructor(props) {
    super(props);

    // Bind functions
    this.renderYears = this.renderYears.bind(this);
    this.renderYear = this.renderYear.bind(this);
  }

  render() {
    const year = Math.floor(getYear(this.props.viewDate) / 10) * 10;

    return (
      <div className="rdtYears">
        <table>
          <thead>
            <tr>
              <th
                className="rdtPrev"
                onClick={this.props.moveTime("sub", 10, "years")}
              >
                <span>‹</span>
              </th>
              <th
                className="rdtSwitch"
                onClick={this.props.showView("years")}
                colSpan={2}
              >
                {year}-{year + 9}
              </th>
              <th
                className="rdtNext"
                onClick={this.props.moveTime("add", 10, "years")}
              >
                <span>›</span>
              </th>
            </tr>
          </thead>
        </table>
        <table>
          <tbody>{this.renderYears(year)}</tbody>
        </table>
      </div>
    );
  }

  renderYears(year) {
    const renderer = this.props.renderYear || this.renderYear;
    const selectedDate = this.props.selectedDate;
    const date = this.props.viewDate;
    const isValid = this.props.isValidDate || returnTrue;
    let years: any[] = [];
    const rows: any[] = [];

    year--;
    for (let yearIndex = -1; yearIndex < 11; yearIndex++, year++) {
      const currentYear = setYear(date, year);

      const noOfDaysInYear = getDaysInYear(date);
      const daysInYear = Array.from({ length: noOfDaysInYear }, (e, i) => {
        return i + 1;
      });

      const validDay = daysInYear.find(d => {
        const day = setDayOfYear(currentYear, d);
        return isValid(day);
      });

      const isDisabled = validDay === undefined;
      const props: any = {
        key: year,
        "data-val": year,
        className: cc([
          "rdtYear",
          {
            rdtDisabled: isDisabled,
            rdtActive: selectedDate && getYear(selectedDate) === year
          }
        ])
      };

      if (!isDisabled) {
        props.onClick =
          this.props.updateOn === "years"
            ? this.props.updateSelectedDate()
            : this.props.setDate("years");
      }

      years.push(
        renderer(props, year, selectedDate && new Date(selectedDate.getTime()))
      );

      if (years.length === 4) {
        rows.push(<tr key={yearIndex}>{years}</tr>);
        years = [];
      }
    }

    return rows;
  }

  renderYear(props, year) {
    return <td {...props}>{year}</td>;
  }
}

export default YearsView;
