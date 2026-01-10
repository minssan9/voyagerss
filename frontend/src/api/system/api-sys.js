import service from '@/api/common/axios-voyagerss.js'

const apiSys = {
  getSysConfLike (code) {
    return service.get(`common/sys/conf/${code}`)
  },
  getSysI18n (language) {
    return service.get(`common/sys-i18n?language=` + language)
  },
}

export default apiSys


