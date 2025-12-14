import apiAccount from '@/api/modules/api-account'
import apiTeam from '@/api/modules/api-team'
import Cookies from 'js-cookie'
import { defineStore } from 'pinia'

interface Team {
  id: number
  name: string
  region?: string
}

interface AccountRole {
  roleType: string
}

interface User {
  accountId: string | null
  accountRoles: AccountRole[] | null
  accountSnsId: string | null
  accountSnsList: any[]
  createdAt: string | null
  email: string | null
  englishName: string | null
  expired: string | null
  koreanName: string | null
  password: string | null
  phone: string
  providerType: string | null
  accessToken: string | null
  refreshToken: string | null
  role: string | null
  snsAccount: string | null
  status: string | null
  username: string | null
  profileImageUrl: string
  profileVideoUrl: string
  accountInfo?: any // Type this based on your accountInfo structure

  teamId: number | null
}

interface UserState {
  diagnostics: Record<string, any>
  monitor: Record<string, any>
  system: Record<string, any>
  filteredAlarmLevel: Array<{ text: string; value: string }>
  user: User
  accountInfo: any[] // Type this based on your accountInfo structure
  isAuthPhone: boolean
  teams: Team[]
}

export const useUserStore = defineStore('user', {
  state: (): UserState => ({
    diagnostics: {},
    monitor: {},
    system: {},
    filteredAlarmLevel: [
      { text: "alert", value: "alert" },
      { text: "warning", value: "warning" },
      { text: "normal", value: "normal" },
      { text: "offline", value: "offline" },
    ],
    user: {
      accountId: null,
      accountRoles: null,
      accountSnsId: null,
      accountSnsList: [],
      createdAt: null,
      email: null,
      englishName: null,
      expired: null,
      koreanName: null,
      password: null,
      phone: '',
      providerType: null,
      accessToken: null,
      refreshToken: null,
      role: null,
      snsAccount: null,
      status: null,
      username: null,
      profileImageUrl: '',
      profileVideoUrl: '',

      teamId: null
    },
    accountInfo: [],
    isAuthPhone: false,
    teams: []
  }),

  getters: {
    accountId: (state): string | null => state.user.accountId,
    accessToken: (state): string | null => state.user.accessToken,
    refreshToken: (state): string | null => state.user.refreshToken,
    isWorker: (state): boolean => 
      state.user.accountRoles?.map(ar => ar.roleType).includes('WORKER') && 
      state.user.accountRoles?.length === 1,
    isOwner: (state): boolean => 
      state.user.accountRoles?.map(ar => ar.roleType).includes('OWNER') ?? false,
    isManager: (state): boolean => 
      state.user.accountRoles?.map(ar => ar.roleType).includes('MANAGER') ?? false,
    teamOptions: (state) => state.teams.map(team => ({
      label: team.name,
      value: team.id
    }))
  },

  actions: {
    async fetchUser(): Promise<User> {
      if (!this.user.accountId) {
        try {
          const res = await apiAccount.getUser()
          Cookies.set('refreshToken', res.data.refreshToken, { expires: 7 })
          Cookies.set('accountId',    res.data.accountId, { expires: 7 })
          Cookies.set('username',     res.data.username, { expires: 7 })
          Cookies.set('email',        res.data.email, { expires: 7 })
          Cookies.set('role',         res.data.accountRoles, { expires: 7 })
          this.user = res.data

          const accountInfo = await apiAccount.getAccountInfo(res.data.accountId)
          if (accountInfo.accountId) {
            this.user = { ...this.user, ...accountInfo }
          }

          // Fetch teams after user data is loaded
          if (this.user.accountId) {
            await this.fetchTeams()
          }

          return res.data
        } catch (error) {
          console.error('Error fetching user:', error)
          throw error
        }
      }
      return this.user
    },

    async fetchTeams(): Promise<void> {
      if (!this.user.accountId) return
      
      try {
        const response = await apiAccount.getTeamsByAccountId(this.user.accountId)
        this.teams = response.data
      } catch (error) {
        console.error('Error fetching teams:', error)
        throw error
      }
    },

    async updateUser(): Promise<User> {
      try {
        const res = await apiAccount.putUser(this.user)
        this.user = res
        return res
      } catch (error) {
        console.error('Error updating user:', error)
        throw error
      }
    },

    async saveAccountInfo(accountInfo: any): Promise<User> {
      try {
        const res = await apiAccount.saveAccountInfo(accountInfo)
        this.user = { ...this.user, ...res }
        return res
      } catch (error) {
        console.error('Error saving account info:', error)
        throw error
      }
    },

    async saveAccountProfileImage({ accountId, accountProfileImage }: { 
      accountId: string, 
      accountProfileImage: File 
    }): Promise<any> {
      try {
        const res = await apiAccount.saveProfileImg(accountId, accountProfileImage)
        return res
      } catch (error) {
        console.error('Error saving profile image:', error)
        throw error
      }
    },

    async login(token: string | null): Promise<void> {
      if (token) {
        Cookies.set('accessToken', token)
      } else {
        Cookies.remove('accessToken')
        Cookies.remove('refreshToken')
      }
    },

    async logout(): Promise<void> {
      Cookies.remove('accessToken')
      Cookies.remove('refreshToken')
      Cookies.remove('accountId')
      Cookies.remove('username')
      Cookies.remove('email')
      Cookies.remove('role')
      this.user = {
        accountId: null,
        username: null,
        email: null,
        role: null,
        accessToken: null,
        refreshToken: null,
        accountRoles: null,
        accountSnsId: null,
        accountSnsList: [],
        createdAt: null,
        englishName: null,
        expired: null,
        koreanName: null,
        password: null,
        phone: '',
        providerType: null,
        snsAccount: null,
        status: null,
        profileImageUrl: '',
        profileVideoUrl: '',
      }
      // Reset any other state properties if needed
      this.accountInfo = []
    },

    setTeam(teamId: number | null): void {
      this.user.teamId = teamId
    },

    setAccessToken(accessToken: string): void {
      this.user.accessToken = accessToken
    },

    setRefreshToken(refreshToken: string): void {
      this.user.refreshToken = refreshToken
    }
  }
}) 