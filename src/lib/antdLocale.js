import koKR from 'antd/locale/ko_KR'

const shortWeekDaysMonFirst = ['월', '화', '수', '목', '금', '토', '일']

const datePickerLocale = {
  ...koKR.DatePicker,
  lang: {
    ...koKR.DatePicker.lang,
    shortWeekDays: shortWeekDaysMonFirst,
  },
}

/** antd 전역 로케일 — 주 시작: 월요일 */
const antdLocale = {
  ...koKR,
  DatePicker: datePickerLocale,
  Calendar: datePickerLocale,
}

export default antdLocale
export { datePickerLocale }
