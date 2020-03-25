const moment = require('moment');
function Timeline(format, year, month) {
  month = +month - 1;
  const date = new moment(new Date(year, month, 1));
  const daysInMonth = date.daysInMonth();
  let timeline = [];
  for (let day = 1; day <= daysInMonth; day++) {
    if (timeline.length >= 12) continue;
    let d = new moment(new Date(year, month, day));
    if (d.day() === 0 || d.day() === 6) continue;
    timeline.push(day);
  }
  timeline.sort((a, b) => (a > b ? 1 : -1));
  switch (format) {
    case 'yyyy-MM-dd':
      return timeline.map(day =>
        new moment(new Date(year, month, day)).format('YYYY-MM-DD')
      );
    default:
      return timeline
        .map(
          day =>
            `\n               ${new moment(new Date(year, month, day)).format(
              'MM月DD日'
            )}： 22：00`
        )
        .join(',');
  }
}
module.exports = Timeline;
