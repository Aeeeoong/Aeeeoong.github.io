import dayjs from 'dayjs'
import localeData from 'dayjs/plugin/localeData'
import updateLocale from 'dayjs/plugin/updateLocale'
import weekday from 'dayjs/plugin/weekday'
import 'dayjs/locale/ko'

dayjs.extend(updateLocale)
dayjs.extend(localeData)
dayjs.extend(weekday)
dayjs.updateLocale('ko', { weekStart: 1 })
dayjs.locale('ko')

export default dayjs
