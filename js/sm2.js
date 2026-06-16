/**
 * SM-2 婰壇傾儖僑儕僘儉
 * 
 * Anki 偱巊傢傟偰偄傞儊儌儕嫮壔傾儖僑儕僘儉偺幚憰丅
 * 奺崁栚偵埲壓偺僷儔儊乕僞傪帩偨偣傞丗
 *   - mastery: 0?5 (彾埇儗儀儖)
 *   - interval: 師暅廗傑偱偺擔悢
 *   - repetitions: 楢懕惓摎夞悢
 *   - ef: 擄堈搙學悢乮僨僼僅儖僩 2.5乯
 *   - nextReview: 師暅廗擔偺 ISO 暥帤楍乮null = 枹??乯
 *   - history: 暅廗棜楌 { date, result, response }
 */

const SM2 = {
  DEFAULT_EF: 2.5,
  DEFAULT_MASTERY: 0,

  /**
   * 怴婯崁栚偺弶婜壔
   */
  initItem() {
    return {
      mastery: 0,
      interval: 0,
      repetitions: 0,
      ef: this.DEFAULT_EF,
      nextReview: null,
      history: []
    };
  },

  /**
   * 暅廗幚峴 ? 惓夝偺応崌
   * @param {Object} item ? 崁栚僨乕僞乮捈愙峏怴偝傟傞乯
   * @param {string} [response] ? 儐乕僓乕偺夞摎乮棜楌梡乯
   * @returns {Object} 峏怴屻偺 item
   */
  correct(item, response) {
    this._normalizeItem(item);
    item.repetitions += 1;
    
    if (item.repetitions === 1) {
      item.interval = 1;
    } else if (item.repetitions === 2) {
      item.interval = 6;
    } else {
      item.interval = Math.ceil(item.interval * item.ef);
    }

    item.mastery = Math.min(item.repetitions, 5);
    item.nextReview = this._futureDate(item.interval);
    item.history.push({
      date: new Date().toISOString(),
      result: true,
      response: response || ''
    });

    return item;
  },

  /**
   * 暅廗幚峴 ? 晄惓夝偺応崌
   */
  incorrect(item, response) {
    this._normalizeItem(item);
    item.repetitions = 0;
    item.interval = 1;
    item.mastery = 0;
    item.nextReview = this._futureDate(1);
    item.history.push({
      date: new Date().toISOString(),
      result: false,
      response: response || ''
    });

    return item;
  },

  /**
   * 暅廗幚峴 ? "傑偁傑偁傢偐偭偨"乮拞娫敾掕乯
   * 惓夝傛傝彮偟桪偟偄張棟
   */
  medium(item, response) {
    this._normalizeItem(item);
    item.repetitions = Math.max(0, item.repetitions - 1);
    if (item.repetitions === 0) {
      item.interval = 1;
      item.mastery = 0;
    } else if (item.repetitions === 1) {
      item.interval = 3;
      item.mastery = 1;
    } else {
      item.interval = Math.ceil(item.interval * 1.5);
      item.mastery = Math.min(item.repetitions, 5);
    }
    item.nextReview = this._futureDate(item.interval);
    item.history.push({
      date: new Date().toISOString(),
      result: 'medium',
      response: response || ''
    });

    return item;
  },

  /**
   * 巜掕擔悢屻偺 ISO 暥帤楍傪惗惉
   */
  _futureDate(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  },

  _normalizeItem(item) {
    item.repetitions = Number(item.repetitions || 0);
    item.interval = Number(item.interval || 0);
    item.ef = Number(item.ef || this.DEFAULT_EF);
    item.mastery = Number(item.mastery || this.DEFAULT_MASTERY);
    if (!Array.isArray(item.history)) item.history = [];
    return item;
  },

  /**
   * 暅廗偑昁梫側崁栚悢傪庢摼
   */
  countDue(items) {
    const now = new Date();
    return items.filter(item => {
      if (!item.nextReview) return true;
      return new Date(item.nextReview) <= now;
    }).length;
  },

  /**
   * 妛廗摑寁傪寁嶼
   */
  getStats(items) {
    const now = new Date();
    return {
      total: items.length,
      due: this.countDue(items),
      new: items.filter(i => !i.nextReview).length,
      mastered: items.filter(i => i.mastery >= 5).length,
      todayReviewed: items.filter(i => {
        const last = i.history[i.history.length - 1];
        if (!last) return false;
        return new Date(last.date).toDateString() === now.toDateString();
      }).length
    };
  },

  /**
   * 師夞偺暅廗僗働僕儏乕儖傪慡崁栚偵偮偄偰寁嶼偟偰峏怴
   */
  refreshSchedules(items) {
    return items.map(item => {
      if (item.nextReview) {
        const next = new Date(item.nextReview);
        if (next <= new Date()) {
          // 婜尷愗傟側傜嵞僗働僕儏乕儖
          if (item.repetitions === 0) {
            item.interval = 1;
          } else {
            item.interval = Math.max(1, Math.ceil(item.interval * item.ef));
          }
          item.nextReview = this._futureDate(item.interval);
        }
      }
      return item;
    });
  },
  /**
   * 暅廗偑昁梫側崁栚偺攝楍傪庢摼
   */
  getDue(items) {
    const now = new Date();
    return items.filter(item => {
      if (!item.nextReview) return true;
      return new Date(item.nextReview) <= now;
    });
  }
};
