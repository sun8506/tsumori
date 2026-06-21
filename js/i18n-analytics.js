(() => {
  const rows = [
    ['policy.analyticsTitle', '访问统计与 Cookie', 'Analytics and cookies', 'アクセス解析と Cookie', '접속 통계 및 쿠키', 'Thống kê truy cập và cookie', 'အသုံးပြုမှုစာရင်းနှင့် Cookie'],
    ['policy.analytics', '网站使用 Google Analytics 统计页面路径和基础功能事件，以改进产品。不会发送姓名、邮箱、学习内容、密码或 API Key。', 'This site uses Google Analytics to measure page paths and basic feature events so we can improve the product. We never send names, email addresses, learning content, passwords, or API keys.', '本サイトは製品改善のため、Google Analytics でページ経路と基本機能イベントを測定します。氏名、メール、学習内容、パスワード、APIキーは送信しません。', '이 사이트는 제품 개선을 위해 Google Analytics로 페이지 경로와 기본 기능 이벤트를 측정합니다. 이름, 이메일, 학습 내용, 비밀번호, API 키는 전송하지 않습니다.', 'Trang web sử dụng Google Analytics để đo đường dẫn trang và sự kiện tính năng cơ bản nhằm cải thiện sản phẩm. Chúng tôi không gửi tên, email, nội dung học, mật khẩu hoặc khóa API.', 'ထုတ်ကုန်တိုးတက်စေရန် ဤဝဘ်ဆိုက်သည် Google Analytics ဖြင့် စာမျက်နှာလမ်းကြောင်းနှင့် အခြေခံလုပ်ဆောင်ချက်ဖြစ်ရပ်များကို တိုင်းတာပါသည်။ အမည်၊ အီးမေးလ်၊ သင်ခန်းစာ၊ စကားဝှက် သို့မဟုတ် API Key ကို မပို့ပါ။']
  ];

  rows.forEach(([key, zh, en, ja, ko, vi, my]) => {
    const values = { zh, en, ja, ko, vi, my };
    Object.entries(values).forEach(([language, value]) => {
      I18n.messages[language][key] = value;
      I18n.phraseKeys?.set(value, key);
    });
  });
})();
