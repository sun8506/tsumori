const I18n = {
  supported: ['zh', 'en', 'ja', 'ko', 'vi', 'my'],
  localeMap: { zh: 'zh-CN', en: 'en-US', ja: 'ja-JP', ko: 'ko-KR', vi: 'vi-VN', my: 'my-MM' },
  names: { zh: '中文', en: 'English', ja: '日本語', ko: '한국어', vi: 'Tiếng Việt', my: 'မြန်မာ' },
  messages: {
    zh: {
      'nav.home':'首页','nav.words':'单词','nav.phrases':'短句','nav.news':'阅读','nav.expert':'助手','nav.speaking':'口语','nav.settings':'设置',
      'common.save':'保存','common.cancel':'取消','common.close':'关闭','common.delete':'删除','common.edit':'编辑','common.back':'返回','common.loading':'处理中…','common.empty':'暂无记录',
      'auth.welcome':'欢迎使用 Tsumori','auth.subtitle':'每天积累一点，让日语学习留下清晰记录。','auth.login':'登录','auth.register':'注册账号','auth.name':'昵称','auth.email':'邮箱','auth.password':'密码','auth.passwordHint':'至少 8 位，包含字母和数字','auth.confirmPassword':'确认密码','auth.language':'界面语言','auth.consent':'我已阅读并同意隐私政策与使用条款','auth.openPolicy':'查看隐私政策与使用条款','auth.noAccount':'还没有账号？','auth.hasAccount':'已有账号？','auth.logout':'退出登录','auth.loginFailed':'邮箱或密码不正确。','auth.emailExists':'该邮箱已注册。','auth.passwordInvalid':'密码至少 8 位，并包含字母和数字。','auth.passwordMismatch':'两次输入的密码不一致。','auth.consentRequired':'请先阅读并同意隐私政策与使用条款。','auth.invalidEmail':'请输入有效邮箱地址。','auth.required':'请完整填写必填项。','auth.security':'密码会经过加盐哈希后保存在此浏览器；当前版本不会上传账号数据。','auth.localNotice':'本地账号','auth.localDetail':'账号和学习数据仅保存在当前浏览器，不支持跨设备找回。请定期导出备份。',
      'policy.title':'隐私政策与使用条款','policy.summary':'继续注册前，请了解当前本地版本的数据处理方式。','policy.dataTitle':'数据保存','policy.data':'账号、密码哈希、学习记录和设置保存在当前浏览器。清除浏览器数据可能导致内容永久丢失。','policy.aiTitle':'AI 与第三方服务','policy.ai':'使用 AI 功能时，输入内容会发送给你选择的 AI 服务商。请勿输入密码、证件、财务、医疗或其他敏感信息。','policy.keyTitle':'API Key','policy.key':'当前版本将 API Key 保存在浏览器，并通过本地服务转发请求。请勿在公共设备使用。','policy.contentTitle':'内容责任','policy.content':'AI 输出仅供学习参考，可能不准确。重要内容应通过权威资料核实。','policy.rightsTitle':'你的控制权','policy.rights':'你可以导出或清除本地数据，也可以退出账号。当前版本无法恢复未备份的数据。','policy.agree':'我已了解并同意',
      'settings.title':'设置','settings.subtitle':'管理账号、学习偏好、AI 与本地数据。','settings.account':'账号','settings.profile':'学习资料','settings.api':'AI 设置','settings.data':'数据','settings.guide':'使用说明','settings.about':'关于','settings.language':'界面语言','settings.languageHelp':'切换后所有页面会立即使用所选语言。','settings.logout':'退出当前账号','settings.privacy':'隐私与安全','settings.consentAt':'同意时间','settings.localAccount':'当前为本地账号，数据仅保存在此浏览器。'
    },
    en: {
      'nav.home':'Home','nav.words':'Words','nav.phrases':'Phrases','nav.news':'Reading','nav.expert':'Expert','nav.speaking':'Speaking','nav.settings':'Settings',
      'common.save':'Save','common.cancel':'Cancel','common.close':'Close','common.delete':'Delete','common.edit':'Edit','common.back':'Back','common.loading':'Working…','common.empty':'No records',
      'auth.welcome':'Welcome to Tsumori','auth.subtitle':'Build your Japanese a little every day and keep a clear learning record.','auth.login':'Sign in','auth.register':'Create account','auth.name':'Display name','auth.email':'Email','auth.password':'Password','auth.passwordHint':'At least 8 characters with letters and numbers','auth.confirmPassword':'Confirm password','auth.language':'Interface language','auth.consent':'I have read and agree to the Privacy Policy and Terms','auth.openPolicy':'View Privacy Policy and Terms','auth.noAccount':'Need an account?','auth.hasAccount':'Already have an account?','auth.logout':'Sign out','auth.loginFailed':'Incorrect email or password.','auth.emailExists':'This email is already registered.','auth.passwordInvalid':'Use at least 8 characters with letters and numbers.','auth.passwordMismatch':'The passwords do not match.','auth.consentRequired':'Please accept the Privacy Policy and Terms.','auth.invalidEmail':'Enter a valid email address.','auth.required':'Complete all required fields.','auth.security':'Your salted password hash is stored in this browser. This local version does not upload account data.','auth.localNotice':'Local account','auth.localDetail':'Your account and learning data exist only in this browser. Export backups regularly.',
      'policy.title':'Privacy Policy and Terms','policy.summary':'Please understand how this local version handles data before registering.','policy.dataTitle':'Data storage','policy.data':'Account data, password hashes, learning records, and settings are stored in this browser. Clearing browser data may permanently remove them.','policy.aiTitle':'AI and third parties','policy.ai':'AI requests send your input to the provider you select. Do not enter sensitive information.','policy.keyTitle':'API keys','policy.key':'This version stores your API key in the browser and sends requests through the local service. Do not use it on public devices.','policy.contentTitle':'Content responsibility','policy.content':'AI output is for learning support and may be inaccurate. Verify important content.','policy.rightsTitle':'Your controls','policy.rights':'You can export or clear local data and sign out. Unbacked-up data cannot be recovered.','policy.agree':'I understand and agree',
      'settings.title':'Settings','settings.subtitle':'Manage your account, learning preferences, AI, and local data.','settings.account':'Account','settings.profile':'Profile','settings.api':'AI','settings.data':'Data','settings.guide':'Guide','settings.about':'About','settings.language':'Interface language','settings.languageHelp':'All screens update immediately after switching.','settings.logout':'Sign out','settings.privacy':'Privacy and security','settings.consentAt':'Consent date','settings.localAccount':'This is a local account. Data is stored only in this browser.'
    },
    ja: {
      'nav.home':'ホーム','nav.words':'単語','nav.phrases':'フレーズ','nav.news':'読解','nav.expert':'学習支援','nav.speaking':'会話','nav.settings':'設定',
      'common.save':'保存','common.cancel':'キャンセル','common.close':'閉じる','common.delete':'削除','common.edit':'編集','common.back':'戻る','common.loading':'処理中…','common.empty':'記録なし',
      'auth.welcome':'Tsumoriへようこそ','auth.subtitle':'毎日少しずつ積み重ね、日本語学習を記録しましょう。','auth.login':'ログイン','auth.register':'アカウント登録','auth.name':'表示名','auth.email':'メール','auth.password':'パスワード','auth.passwordHint':'英字と数字を含む8文字以上','auth.confirmPassword':'パスワード確認','auth.language':'表示言語','auth.consent':'プライバシーポリシーと利用規約に同意します','auth.openPolicy':'ポリシーと規約を表示','auth.noAccount':'アカウントをお持ちでない方','auth.hasAccount':'アカウントをお持ちの方','auth.logout':'ログアウト','auth.loginFailed':'メールまたはパスワードが正しくありません。','auth.emailExists':'このメールは登録済みです。','auth.passwordInvalid':'英字と数字を含む8文字以上にしてください。','auth.passwordMismatch':'パスワードが一致しません。','auth.consentRequired':'ポリシーと規約への同意が必要です。','auth.invalidEmail':'有効なメールを入力してください。','auth.required':'必須項目を入力してください。','auth.security':'パスワードはソルト付きハッシュでこのブラウザに保存され、外部には送信されません。','auth.localNotice':'ローカルアカウント','auth.localDetail':'アカウントと学習データはこのブラウザ内だけに保存されます。定期的にバックアップしてください。',
      'policy.title':'プライバシーポリシーと利用規約','policy.summary':'登録前にローカル版のデータ処理をご確認ください。','policy.dataTitle':'データ保存','policy.data':'アカウント、パスワードハッシュ、学習記録、設定はこのブラウザに保存されます。','policy.aiTitle':'AIと外部サービス','policy.ai':'AI機能では入力内容が選択したAI事業者へ送信されます。機密情報を入力しないでください。','policy.keyTitle':'APIキー','policy.key':'APIキーはブラウザに保存され、ローカルサービス経由で使用されます。共有端末では使用しないでください。','policy.contentTitle':'生成内容','policy.content':'AI出力は学習補助であり、誤りを含む可能性があります。','policy.rightsTitle':'データ管理','policy.rights':'ローカルデータの書き出し、消去、ログアウトが可能です。未保存データは復元できません。','policy.agree':'理解して同意します',
      'settings.title':'設定','settings.subtitle':'アカウント、学習設定、AI、ローカルデータを管理します。','settings.account':'アカウント','settings.profile':'学習設定','settings.api':'AI設定','settings.data':'データ','settings.guide':'使い方','settings.about':'このアプリ','settings.language':'表示言語','settings.languageHelp':'切り替えると全画面にすぐ反映されます。','settings.logout':'ログアウト','settings.privacy':'プライバシーと安全','settings.consentAt':'同意日時','settings.localAccount':'ローカルアカウントです。データはこのブラウザだけに保存されます。'
    },
    ko: {
      'nav.home':'홈','nav.words':'단어','nav.phrases':'문장','nav.news':'읽기','nav.expert':'학습 도우미','nav.speaking':'말하기','nav.settings':'설정',
      'common.save':'저장','common.cancel':'취소','common.close':'닫기','common.delete':'삭제','common.edit':'편집','common.back':'뒤로','common.loading':'처리 중…','common.empty':'기록 없음',
      'auth.welcome':'Tsumori에 오신 것을 환영합니다','auth.subtitle':'매일 조금씩 일본어를 쌓고 학습 기록을 남기세요.','auth.login':'로그인','auth.register':'계정 만들기','auth.name':'이름','auth.email':'이메일','auth.password':'비밀번호','auth.passwordHint':'영문과 숫자를 포함한 8자 이상','auth.confirmPassword':'비밀번호 확인','auth.language':'화면 언어','auth.consent':'개인정보 처리방침 및 이용약관에 동의합니다','auth.openPolicy':'정책 및 약관 보기','auth.noAccount':'계정이 없나요?','auth.hasAccount':'이미 계정이 있나요?','auth.logout':'로그아웃','auth.loginFailed':'이메일 또는 비밀번호가 올바르지 않습니다.','auth.emailExists':'이미 등록된 이메일입니다.','auth.passwordInvalid':'영문과 숫자를 포함해 8자 이상 입력하세요.','auth.passwordMismatch':'비밀번호가 일치하지 않습니다.','auth.consentRequired':'정책과 약관에 동의해 주세요.','auth.invalidEmail':'올바른 이메일을 입력하세요.','auth.required':'필수 항목을 모두 입력하세요.','auth.security':'비밀번호는 솔트 해시로 이 브라우저에 저장되며 외부로 전송되지 않습니다.','auth.localNotice':'로컬 계정','auth.localDetail':'계정과 학습 데이터는 이 브라우저에만 저장됩니다. 정기적으로 백업하세요.',
      'policy.title':'개인정보 처리방침 및 이용약관','policy.summary':'가입 전에 로컬 버전의 데이터 처리 방식을 확인하세요.','policy.dataTitle':'데이터 저장','policy.data':'계정, 비밀번호 해시, 학습 기록과 설정은 이 브라우저에 저장됩니다.','policy.aiTitle':'AI 및 제3자 서비스','policy.ai':'AI 기능 사용 시 입력 내용이 선택한 제공업체로 전송됩니다. 민감한 정보를 입력하지 마세요.','policy.keyTitle':'API 키','policy.key':'API 키는 브라우저에 저장되고 로컬 서비스를 통해 사용됩니다.','policy.contentTitle':'콘텐츠 책임','policy.content':'AI 출력은 학습 참고용이며 부정확할 수 있습니다.','policy.rightsTitle':'사용자 권한','policy.rights':'로컬 데이터를 내보내거나 삭제하고 로그아웃할 수 있습니다.','policy.agree':'이해하고 동의합니다',
      'settings.title':'설정','settings.subtitle':'계정, 학습 설정, AI와 로컬 데이터를 관리합니다.','settings.account':'계정','settings.profile':'학습 설정','settings.api':'AI 설정','settings.data':'데이터','settings.guide':'사용법','settings.about':'정보','settings.language':'화면 언어','settings.languageHelp':'전환하면 모든 화면에 즉시 적용됩니다.','settings.logout':'로그아웃','settings.privacy':'개인정보 및 보안','settings.consentAt':'동의 일시','settings.localAccount':'로컬 계정이며 데이터는 이 브라우저에만 저장됩니다.'
    },
    vi: {
      'nav.home':'Trang chủ','nav.words':'Từ vựng','nav.phrases':'Cụm từ','nav.news':'Đọc hiểu','nav.expert':'Trợ lý','nav.speaking':'Nói','nav.settings':'Cài đặt',
      'common.save':'Lưu','common.cancel':'Hủy','common.close':'Đóng','common.delete':'Xóa','common.edit':'Sửa','common.back':'Quay lại','common.loading':'Đang xử lý…','common.empty':'Chưa có dữ liệu',
      'auth.welcome':'Chào mừng đến với Tsumori','auth.subtitle':'Tích lũy tiếng Nhật mỗi ngày và lưu lại quá trình học.','auth.login':'Đăng nhập','auth.register':'Tạo tài khoản','auth.name':'Tên hiển thị','auth.email':'Email','auth.password':'Mật khẩu','auth.passwordHint':'Ít nhất 8 ký tự, gồm chữ và số','auth.confirmPassword':'Xác nhận mật khẩu','auth.language':'Ngôn ngữ giao diện','auth.consent':'Tôi đồng ý với Chính sách quyền riêng tư và Điều khoản','auth.openPolicy':'Xem chính sách và điều khoản','auth.noAccount':'Chưa có tài khoản?','auth.hasAccount':'Đã có tài khoản?','auth.logout':'Đăng xuất','auth.loginFailed':'Email hoặc mật khẩu không đúng.','auth.emailExists':'Email này đã được đăng ký.','auth.passwordInvalid':'Mật khẩu cần ít nhất 8 ký tự, gồm chữ và số.','auth.passwordMismatch':'Mật khẩu không khớp.','auth.consentRequired':'Vui lòng đồng ý với chính sách và điều khoản.','auth.invalidEmail':'Vui lòng nhập email hợp lệ.','auth.required':'Vui lòng điền đủ thông tin.','auth.security':'Mật khẩu được băm kèm salt và lưu trong trình duyệt này, không tải lên bên ngoài.','auth.localNotice':'Tài khoản cục bộ','auth.localDetail':'Tài khoản và dữ liệu học chỉ nằm trong trình duyệt này. Hãy sao lưu thường xuyên.',
      'policy.title':'Chính sách quyền riêng tư và Điều khoản','policy.summary':'Hãy hiểu cách phiên bản cục bộ xử lý dữ liệu trước khi đăng ký.','policy.dataTitle':'Lưu dữ liệu','policy.data':'Tài khoản, mã băm mật khẩu, lịch sử học và cài đặt được lưu trong trình duyệt.','policy.aiTitle':'AI và bên thứ ba','policy.ai':'Khi dùng AI, nội dung nhập được gửi đến nhà cung cấp bạn chọn. Không nhập thông tin nhạy cảm.','policy.keyTitle':'Khóa API','policy.key':'Khóa API được lưu trong trình duyệt và dùng qua dịch vụ cục bộ.','policy.contentTitle':'Nội dung AI','policy.content':'Kết quả AI chỉ hỗ trợ học tập và có thể sai.','policy.rightsTitle':'Quyền kiểm soát','policy.rights':'Bạn có thể xuất, xóa dữ liệu cục bộ và đăng xuất.','policy.agree':'Tôi hiểu và đồng ý',
      'settings.title':'Cài đặt','settings.subtitle':'Quản lý tài khoản, tùy chọn học, AI và dữ liệu cục bộ.','settings.account':'Tài khoản','settings.profile':'Hồ sơ học','settings.api':'Cài đặt AI','settings.data':'Dữ liệu','settings.guide':'Hướng dẫn','settings.about':'Giới thiệu','settings.language':'Ngôn ngữ giao diện','settings.languageHelp':'Mọi màn hình cập nhật ngay sau khi chuyển.','settings.logout':'Đăng xuất','settings.privacy':'Quyền riêng tư và bảo mật','settings.consentAt':'Thời gian đồng ý','settings.localAccount':'Đây là tài khoản cục bộ; dữ liệu chỉ lưu trong trình duyệt này.'
    },
    my: {
      'nav.home':'ပင်မ','nav.words':'စကားလုံး','nav.phrases':'ဝါကျတို','nav.news':'ဖတ်ရှုခြင်း','nav.expert':'လေ့လာရေးအကူ','nav.speaking':'စကားပြော','nav.settings':'ဆက်တင်',
      'common.save':'သိမ်းမည်','common.cancel':'မလုပ်တော့','common.close':'ပိတ်မည်','common.delete':'ဖျက်မည်','common.edit':'ပြင်မည်','common.back':'နောက်သို့','common.loading':'လုပ်ဆောင်နေသည်…','common.empty':'မှတ်တမ်းမရှိ',
      'auth.welcome':'Tsumori မှ ကြိုဆိုပါသည်','auth.subtitle':'နေ့တိုင်း ဂျပန်စာကို အနည်းငယ်စီ စုဆောင်းပြီး လေ့လာမှုမှတ်တမ်းထားပါ။','auth.login':'ဝင်မည်','auth.register':'အကောင့်ဖွင့်မည်','auth.name':'အမည်','auth.email':'အီးမေးလ်','auth.password':'စကားဝှက်','auth.passwordHint':'အက္ခရာနှင့် ဂဏန်းပါ ၈ လုံးအနည်းဆုံး','auth.confirmPassword':'စကားဝှက်အတည်ပြု','auth.language':'မျက်နှာပြင်ဘာသာ','auth.consent':'ကိုယ်ရေးအချက်အလက်မူဝါဒနှင့် စည်းကမ်းချက်များကို သဘောတူပါသည်','auth.openPolicy':'မူဝါဒနှင့် စည်းကမ်းချက်များကြည့်ရန်','auth.noAccount':'အကောင့်မရှိသေးပါသလား?','auth.hasAccount':'အကောင့်ရှိပြီးသားလား?','auth.logout':'ထွက်မည်','auth.loginFailed':'အီးမေးလ် သို့မဟုတ် စကားဝှက် မမှန်ပါ။','auth.emailExists':'ဤအီးမေးလ်ကို မှတ်ပုံတင်ပြီးပါပြီ။','auth.passwordInvalid':'အက္ခရာနှင့် ဂဏန်းပါ ၈ လုံးအနည်းဆုံး ထည့်ပါ။','auth.passwordMismatch':'စကားဝှက်နှစ်ခု မတူပါ။','auth.consentRequired':'မူဝါဒနှင့် စည်းကမ်းချက်များကို သဘောတူပါ။','auth.invalidEmail':'မှန်ကန်သော အီးမေးလ်ထည့်ပါ။','auth.required':'လိုအပ်သောအချက်များ ဖြည့်ပါ။','auth.security':'စကားဝှက်ကို salt ပါ hash အဖြစ် ဤဘရောက်ဇာတွင် သိမ်းထားပြီး အပြင်သို့ မတင်ပါ။','auth.localNotice':'ဒေသတွင်းအကောင့်','auth.localDetail':'အကောင့်နှင့် လေ့လာမှုဒေတာသည် ဤဘရောက်ဇာတွင်သာ ရှိသည်။ ပုံမှန် backup လုပ်ပါ။',
      'policy.title':'ကိုယ်ရေးအချက်အလက်မူဝါဒနှင့် စည်းကမ်းချက်များ','policy.summary':'မှတ်ပုံတင်မီ ဒေသတွင်းဗားရှင်း၏ ဒေတာကိုင်တွယ်ပုံကို နားလည်ပါ။','policy.dataTitle':'ဒေတာသိမ်းဆည်းမှု','policy.data':'အကောင့်၊ စကားဝှက် hash၊ လေ့လာမှုမှတ်တမ်းနှင့် ဆက်တင်များကို ဤဘရောက်ဇာတွင် သိမ်းသည်။','policy.aiTitle':'AI နှင့် ပြင်ပဝန်ဆောင်မှု','policy.ai':'AI သုံးရာတွင် အကြောင်းအရာကို ရွေးချယ်ထားသော AI ပံ့ပိုးသူထံ ပို့သည်။','policy.keyTitle':'API Key','policy.key':'API Key ကို ဘရောက်ဇာတွင်သိမ်းပြီး ဒေသတွင်းဝန်ဆောင်မှုမှတစ်ဆင့် အသုံးပြုသည်။','policy.contentTitle':'AI အကြောင်းအရာ','policy.content':'AI ရလဒ်သည် လေ့လာရေးအကူသာဖြစ်ပြီး မှားနိုင်သည်။','policy.rightsTitle':'သင်၏ထိန်းချုပ်မှု','policy.rights':'ဒေသတွင်းဒေတာကို export၊ ဖျက်ခြင်းနှင့် logout လုပ်နိုင်သည်။','policy.agree':'နားလည်ပြီး သဘောတူပါသည်',
      'settings.title':'ဆက်တင်','settings.subtitle':'အကောင့်၊ လေ့လာမှုရွေးချယ်မှု၊ AI နှင့် ဒေသတွင်းဒေတာကို စီမံပါ။','settings.account':'အကောင့်','settings.profile':'လေ့လာမှုအချက်အလက်','settings.api':'AI ဆက်တင်','settings.data':'ဒေတာ','settings.guide':'အသုံးပြုပုံ','settings.about':'အကြောင်း','settings.language':'မျက်နှာပြင်ဘာသာ','settings.languageHelp':'ပြောင်းပြီးသည်နှင့် စာမျက်နှာအားလုံး ချက်ချင်းပြောင်းမည်။','settings.logout':'ထွက်မည်','settings.privacy':'ကိုယ်ရေးလုံခြုံမှု','settings.consentAt':'သဘောတူချိန်','settings.localAccount':'ဒေသတွင်းအကောင့်ဖြစ်ပြီး ဒေတာကို ဤဘရောက်ဇာတွင်သာ သိမ်းသည်။'
    }
  },
  getLanguage() {
    const config = window.Storage?.getConfig?.();
    const user = config?.users?.find(item => item.id === config.currentUserId);
    const value = user?.uiLanguage || localStorage.getItem('tsumori_ui_language_public') || 'zh';
    return this.supported.includes(value) ? value : 'zh';
  },
  setLanguage(language, persistUser = true) {
    const next = this.supported.includes(language) ? language : 'zh';
    localStorage.setItem('tsumori_ui_language_public', next);
    if (persistUser && window.Storage) {
      const userId = Storage._getCurrentUserId();
      if (userId) Storage.updateUserProfile(userId, { uiLanguage: next });
    }
    document.documentElement.lang = this.localeMap[next];
    this.apply(document);
    return next;
  },
  t(key, vars = {}) {
    let text = this.messages[this.getLanguage()]?.[key] ?? this.messages.en?.[key] ?? key;
    Object.entries(vars).forEach(([name, value]) => { text = text.replaceAll(`{${name}}`, String(value)); });
    return text;
  },
  apply(root = document) {
    document.documentElement.lang = this.localeMap[this.getLanguage()];
    root.querySelectorAll?.('[data-i18n]').forEach(node => {
      const value = this.t(node.dataset.i18n);
      if (node.textContent !== value) node.textContent = value;
    });
    root.querySelectorAll?.('[data-i18n-title]').forEach(node => {
      const value = this.t(node.dataset.i18nTitle);
      if (node.title !== value) node.title = value;
    });
    if (this.phraseKeys) {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach(node => {
        if (['SCRIPT', 'STYLE'].includes(node.parentElement?.tagName)) return;
        const value = node.nodeValue;
        const trimmed = value.trim();
        const key = this.phraseKeys.get(trimmed);
        if (key) {
          const translated = value.replace(trimmed, this.t(key));
          if (translated !== value) node.nodeValue = translated;
        }
      });
      root.querySelectorAll?.('[placeholder], [title]').forEach(node => {
        ['placeholder', 'title'].forEach(attribute => {
          const value = node.getAttribute(attribute);
          const key = this.phraseKeys.get(value);
          if (key && node.getAttribute(attribute) !== this.t(key)) node.setAttribute(attribute, this.t(key));
        });
      });
    }
  },
  options(selected = this.getLanguage()) {
    return this.supported.map(code => `<option value="${code}" ${code === selected ? 'selected' : ''}>${this.names[code]}</option>`).join('');
  },
  date(value, options = {}) {
    const date = new Date(value);
    if (this.getLanguage() === 'my') {
      const weekday = this.t(`weekday.${date.getDay()}`);
      if (options.weekday && !options.year && !options.month && !options.day) return weekday;
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      if (!options.year) return `${month}/${day}${options.weekday ? ` ${weekday}` : ''}`;
      return `${date.getFullYear()}-${month}-${day}${options.weekday ? ` ${weekday}` : ''}`;
    }
    return date.toLocaleDateString(this.localeMap[this.getLanguage()], options);
  },
  time(value, options = {}) { return new Date(value).toLocaleTimeString(this.localeMap[this.getLanguage()], options); },
  translate(value) {
    const key = this.phraseKeys?.get(String(value || '').trim());
    return key ? this.t(key) : value;
  },
  observe() {
    if (this.observer) return;
    const nativeAlert = window.alert.bind(window);
    const nativeConfirm = window.confirm.bind(window);
    window.alert = message => nativeAlert(this.translate(message));
    window.confirm = message => nativeConfirm(this.translate(message));
    this.observer = new MutationObserver(mutations => {
      const roots = new Set();
      mutations.forEach(mutation => {
        const element = mutation.target.nodeType === Node.ELEMENT_NODE
          ? mutation.target
          : mutation.target.parentElement;
        if (element) roots.add(element);
      });
      roots.forEach(root => this.apply(root));
    });
    this.observer.observe(document.body, { childList: true, subtree: true });
  }
};
window.I18n = I18n;
window.t = (key, vars) => I18n.t(key, vars);
