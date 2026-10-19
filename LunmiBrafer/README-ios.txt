LunmiBrafer iOS 工程

打开与构建
  打开 LunmiBrafer.xcodeproj，选择 LunmiBrafer scheme 和可用 iPhone 设备。
  工程仅包含 LunmiBrafer App Target；运行、性能分析、静态分析和归档均使用 Release。
  Debug 编译配置保留用于本地开发，但与 Release 使用同一 API 配置，没有独立环境覆盖。
  已移除原生单元测试、UI 测试目标、测试数据、本地 StoreKit 商品文件及对应 Scheme 引用。
  工程显示名称为 Lunmi，支持 iPhone、iOS 15.6+、竖屏，使用 UIKit、WKWebView 和 Apple 原生框架。

目录
  LunmiBrafer/                 原生代码、资源和英文/日文本地化
  LunmiBrafer/Assets.xcassets   用户提供的启动图、App Icon
  LunmiBrafer/lunimcenter.bundledata  自动生成的单文件加密 H5 资源包
  scripts/                    H5 同步、资源嵌入和构建配置脚本

资源同步
  H5 源码位于 ../lunmi_h5，不要直接编辑生成的 lunimcenter.bundledata。
  修改 H5 后执行 pnpm sync:ios，再执行 pnpm check:ios-sync。
  pnpm build:h5 自动同步 iOS；pnpm watch:ios 在持续编辑时监听并同步。
  Xcode 每次构建也会检查、刷新并嵌入当前 H5 资源。
  生产资源归档后执行两层 raw DEFLATE 压缩，再使用 AES-256-GCM 加密，文件名为 lunimcenter.bundledata。
  密钥由 32 个随机字节生成，Base64 编码长度 44 位，声明在 ApogeeAwakenSpark.swift 的 RamblingHelix 中；同步脚本自动定位唯一的密钥声明，不依赖 Swift 文件名，不要输出密钥。
  校验清单包含版本、源码、密文、入口和逐文件 SHA-256，单独认证加密后嵌入同一资源包；工程与 IPA 无独立 manifest.json。
  check:ios-sync 会读取包内清单，解密、解压并核对全部内容。
  构建失败时保留上次完整压缩包；密钥和压缩包必须一起保存，修改密钥后重新同步并构建。
  Xcode 工程直接引用并嵌入单个 lunimcenter.bundledata，增量构建时删除旧 lunimcenter/ 与 Web/ 资源目录。
  同步后需要重新构建、安装 App，已运行的安装包不会自动热更新。
  初次开发需要在 H5 目录执行 pnpm install --frozen-lockfile。
  Xcode 找不到 Node 时可设置 NODE_BINARY 为实际可执行文件路径。

正式业务配置
  H5 .env 与原生 PersistentPivotGlow.swift 使用用户指定的同一接口地址：
    http://0sc8fcvanc9gf8ckb40o.shop/api
  不再有 DebugAPIBaseURL 或其他测试接口覆盖。
  接口相对路径直接拼接，例如登录实际路径为 /api/api/emailLogin。
  构建脚本只为该配置域名生成 HTTP 例外，不放行子域名或其他 HTTP 来源。
  后端提供 HTTPS 地址后应同步更新两处配置，HTTP 例外将自动取消。
  原生 apiBaseURL、liveWebSocketURL、apiBundleID 直接声明为 Swift 常量，供 WebView 注入、内购及网络校验使用。
  已移除独立 Configuration.plist 及其工程资源引用，构建时也会清除旧包残留文件。
  prepare-info.mjs 从同一 Swift URL 常量生成系统要求的 Info.plist HTTP 域名例外，保持与实际接口一致。
  liveWebSocketURL 可显式配置；留空时 H5 按 API 地址推导连接来源。
  登录注册仅使用邮箱，已移除 Apple 登录授权、验证配置及工程能力；Apple 内购功能保留。
  H5 中显式的 VITE_* 配置优先于原生注入值。
  apiBundleID=6101415 为后端应用编号，与 Apple Bundle Identifier 不同。
  当前 Apple Bundle Identifier 保留为 com.lunmi.LunmiBrafer。
  上架仍需配置真实 Team、商品所属正式 Bundle Identifier、签名及 App Store Connect 资料。
  清理工程内容不会自动完成上述账户配置。

页面与权限
  启动时在后台校验、解密并解压加密包，发布到 Library/Caches/<Bundle ID>/lunimcenter/<包摘要>/。
  已解压目录逐文件验证通过后复用；缺失或损坏会从包内资源重新生成，旧版本缓存在新版本成功后清理。
  不在启动过程中下载执行代码；解密解压失败时展示原有错误与重试界面。
  WKURLSchemeHandler 仍从 lunmi://bundle/index.html 读取解压后的页面，无本地 HTTP 服务或端口监听。
  原生桥接只接受包内主页面，外部页面及子框架不能触发原生操作。
  外部 HTTPS 链接在 Safari 视图打开，WebView 检查功能默认关闭。
  登录、注册页不预填账号或密码，已有真实登录状态按原有逻辑保存。
  相机、麦克风、相册、定位、通讯录和生物识别按用户操作请求真实系统权限。
  英日文切换和原生保存的语言偏好保持不变。
  启动图使用 LaunchBackground，按比例铺满屏幕；App Icon 含 iPhone 各尺寸和 1024 像素商店图标。
  系统启动页结束后继续展示同一张 LaunchBackground 和原生 loading，覆盖解密解压及 WebView 首屏准备时间。
  WebView 使用透明背景，下方始终保留启动图；H5 首屏挂载、本地图片/视频封面及字体就绪后通知原生，再平滑淡出遮罩。
  首屏准备不等待业务接口或循环视频播放；图片异常最多等待 3 秒，网页 45 秒未就绪时显示同背景重试界面。
  每次加载使用独立启动标识，旧页面、外部来源和子框架不能移除当前遮罩；减少动态效果设置下取消淡出动画。

苹果内购
  保留用户提供的七个真实 Product ID，按金额升序显示。
  商品配置来自解压后 static/config/coin-packages.json，资源准备好后初始化原生内购并校验商品白名单。
  使用真实 StoreKit 2 商品查询与购买，不加载本地商品模拟文件。
  只有 Apple 本地交易校验通过后才进入余额交付；未配置接口或余额读取失败时不发起扣款。
  按用户指定方案读取 /api/selectUserBalance，计算到账余额，调用 /api/updateUserBalance，
  再调用 /api/addUserBalanceRecord 写入流水；确认到账后 finish 并通知 H5 刷新余额。
  未到账交易保留重试；取消、待批准、校验失败和网络失败不会模拟成功。
  本机交付记录保存在 Application Support/LunmiPurchases/transactions.json，不保存登录 token。
  现有余额接口不支持 transactionId 原子幂等发币，本机记录无法保证跨设备及删除 App 后的去重。
  不会清除真实用户余额、登录数据或待交付交易记录。
  StoreKit 环境由 Apple 的安装及购买渠道决定，工程不伪造付款结果。

构建检查
  cd ../lunmi_h5
  pnpm sync:ios
  pnpm check:ios-sync
  cd ../LunmiBrafer
  xcodebuild -project LunmiBrafer.xcodeproj -scheme LunmiBrafer -configuration Release \
    -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO build
  scripts/generate-project.rb 仅供首次初始化，不覆盖已有工程，也不创建测试目标。

业务边界
  工程清理不代表服务端部署、全部业务联调或 App Store 审核已经完成。
  举报后端提交及其他尚未接通的功能，需要真实服务支持；不会伪造服务器处理结果。

上线前视频与默认头像配置（2026-10-19）
  H5 config/callMedia.js 的 CALL_CONNECTION_ENABLED=false，保留拨号等待和挂断，禁用自动接通及预录视频模拟对方。
  自动模拟来电开关 SHOW_INCOME_CALL=false；路由参数不能覆盖接通开关，直接进入接通页会返回。
  不为关闭的拨号流程请求相机或麦克风权限，Voice Rooms 的权限与媒体逻辑保持原样。
  static/logo.png 已替换为用户提供的 logo，未设置头像时使用此默认图，包括个人资料设置页。
  数据库 config 修改按用户要求跳过；不将 App 包内静态路径写入服务器用户资料。

资源保护边界
  加密包用于保护和校验随 App 一起分发的静态资源；运行所需密钥也在 App 中，不能保证客户端代码不可提取。

页面与花灯动效
  普通页面进入 360ms、离开 180ms；主 Tab 内容淡入 160ms，选中光条移动 220ms。
  放灯、打捞、挂愿使用 LanternRitual 的图片图层与短 CSS 动画，主动作约 1.25 秒，可跳过。
  放灯完成后点亮莲花、扩散水波并漂远；打捞请求等待和有效结果分开，捞到后才提篮显灯。
  挂愿需同账号发布回调与接口记录确认，按 low/mid/high 分支呈现升起、挂住与衰减摆动。
  发布视觉凭据仅在内存中短暂传递并单次消费，路由标记不能单独触发成功展示。
  图片准备好后才开始计时；页面隐藏时暂停并取消完成计时，减少动态效果下使用静态反馈。
  关闭页面、重复点击、空结果、接口失败和账号变化均不会伪造成功或重复提交业务请求。
