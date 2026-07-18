<script>
	import { bootstrapAuth, onNetworkBack } from './utils/offline-auth.js'
	
	export default {
		globalData: {
			authState: 'OFFLINE_GUEST',
			userId: null,
			token: null,
			userProfile: null,
			networkOnline: false,
			appReady: false,
			pageTransitionLock: false // 添加页面跳转锁
		},
		
		onLaunch: function() {
			console.log('App Launch')
			// 启动认证引导器
			this.initAuth()
			// 绑定全局网络监听
			this.bindGlobalNetworkListener()
			// 初始化页面跳转锁
			this.globalData.pageTransitionLock = false
		},
		
		onShow: function() {
			console.log('App Show')
			// 解锁页面跳转
			this.globalData.pageTransitionLock = false
		},
		
		onHide: function() {
			console.log('App Hide')
		},
		
		methods: {
			// 初始化认证系统
			async initAuth() {
				try {
					await bootstrapAuth(this)
					console.log('认证初始化完成，当前状态:', this.globalData.authState)
					// 标记应用已准备就绪
					this.globalData.appReady = true
					// 解锁页面跳转
					this.globalData.pageTransitionLock = false
				} catch (error) {
					console.error('认证初始化失败:', error)
					// 默认进入游客模式
					this.globalData.authState = 'OFFLINE_GUEST'
					this.globalData.appReady = true
					this.globalData.pageTransitionLock = false
				}
			},
			
			// 绑定全局网络监听
			bindGlobalNetworkListener() {
				uni.onNetworkStatusChange(async (res) => {
					this.globalData.networkOnline = res.isConnected
					if (res.isConnected) {
						console.log('网络已连接，尝试自动补登')
						await onNetworkBack(this)
					}
				})
			},
			
			// 安全的页面跳转方法
			safeNavigateTo(url, successCallback, failCallback) {
				// 检查应用是否准备就绪
				if (!this.globalData.appReady) {
					console.warn('应用未准备就绪，延迟跳转:', url)
					setTimeout(() => {
						this.safeNavigateTo(url, successCallback, failCallback)
					}, 200)
					return
				}
				
				// 检查页面跳转锁
				if (this.globalData.pageTransitionLock) {
					console.warn('页面跳转被锁定，延迟执行:', url)
					setTimeout(() => {
						this.safeNavigateTo(url, successCallback, failCallback)
					}, 100)
					return
				}
				
				// 设置跳转锁
				this.globalData.pageTransitionLock = true
				
				uni.navigateTo({
					url: url,
					success: (res) => {
						console.log('页面跳转成功:', url)
						// 延迟解锁，确保跳转完成
						setTimeout(() => {
							this.globalData.pageTransitionLock = false
						}, 300)
						if (successCallback) successCallback(res)
					},
					fail: (err) => {
						console.error('页面跳转失败:', url, err)
						// 立即解锁
						this.globalData.pageTransitionLock = false
						if (failCallback) failCallback(err)
						else {
							uni.showToast({
								title: '页面跳转失败',
								icon: 'none'
							})
						}
					}
				})
			}
		}
	}
</script>

<style>
	/*每个页面公共css */
</style>
