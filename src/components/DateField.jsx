import { DatePicker } from 'antd'
import dayjs from 'dayjs'
import 'dayjs/locale/ko'
import locale from 'antd/es/date-picker/locale/ko_KR'

dayjs.locale('ko')

/**
 * YYYY-MM-DD 문자열을 주고받는 antd DatePicker
 */
export default function DateField({ value, onChange, style, ...rest }) {
  return (
    <DatePicker
      locale={locale}
      value={value ? dayjs(value) : null}
      onChange={(d) => onChange(d ? d.format('YYYY-MM-DD') : '')}
      format="YYYY년 MM월 DD일"
      allowClear={false}
      inputReadOnly
      style={{ width: '100%', ...style }}
      size="large"
      getPopupContainer={(node) => node.parentElement || document.body}
      {...rest}
    />
  )
}
