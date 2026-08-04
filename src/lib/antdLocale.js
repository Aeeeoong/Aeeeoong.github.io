import koKRImport from 'antd/locale/ko_KR'

function unwrapAntdLocale(mod) {
  if (mod?.DatePicker) return mod
  if (mod?.default?.DatePicker) return mod.default
  return mod
}

const koKR = unwrapAntdLocale(koKRImport)
const shortWeekDaysMonFirst = ['월', '화', '수', '목', '금', '토', '일']

const basePickerLocale = koKR.DatePicker || {}
const datePickerLocale = {
  ...basePickerLocale,
  lang: {
    ...(basePickerLocale.lang || {}),
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
