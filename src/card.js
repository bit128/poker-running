/**
 * 卡牌游戏规则
 * ======
 * @property {Array}        cardList            卡牌列表
 * @property {Object}       cardWeight          卡牌权重
 * ======
 * @author 洪波
 * @version 18.04.10
 */
var PokerOrder = cc.Class.extend({
    cardList: [
        "a2","aa","ba","ca","ak","bk","ck","dk","aq","bq","cq","dq","aj","bj","cj","dj",
        "a10","b10","c10","d10","a9","b9","c9","d9","a8","b8","c8","d8","a7","b7","c7","d7",
        "a6","b6","c6","d6","a5","b5","c5","d5","a4","b4","c4","d4","a3","b3","c3","d3"
    ],
    cardWeight: {
        "a3":1,"b3":1,"c3":1,"d3":1,
        "a4":2,"b4":2,"c4":2,"d4":2,
        "a5":3,"b5":3,"c5":3,"d5":3,
        "a6":4,"b6":4,"c6":4,"d6":4,
        "a7":5,"b7":5,"c7":5,"d7":5,
        "a8":6,"b8":6,"c8":6,"d8":6,
        "a9":7,"b9":7,"c9":7,"d9":7,
        "a10":8,"b10":8,"c10":8,"d10":8,
        "aj":9,"bj":9,"cj":9,"dj":9,
        "aq":10,"bq":10,"cq":10,"dq":10,
        "ak":11,"bk":11,"ck":11,"dk":11,
        "aa":12,"ba":12,"ca":12,"a2":13
    },
    /**
     * 统计一组卡牌点数
     * ======
     * @param {Array}    cardList    给定卡组   
     */
    countDigit: function(cardList){
        var cardCount = {};
        for (var i in cardList) {
            var key = this.cardWeight[cardList[i]];
            if (!!cardCount[key]) {
                cardCount[key]++;
            } else {
                cardCount[key]=1;
            }
        }
        var l = Object.keys(cardCount).length;
        if (l == 1) {
            //单点牌 6 - 66 - 666 - 6666
            for (var key in cardCount) {
                return [cardCount[key].toString(), parseInt(key)];
            }
        } else if (l == 2) {
            //双点牌
            var count = [];
            for (var key in cardCount) {
                count.push(cardCount[key]);
            }
            count = count.sort().toString();
            if (count == '1,3' || count == '2,3') {
                //6668 - 66688
                for(var key in cardCount) {
                    if (cardCount[key] == 3)
                        return [count, parseInt(key)];
                }
            } else if (count == '3,3') {
                //666777
                var keys = Object.keys(cardCount);
                var a = parseInt(keys[0]);
                var b = parseInt(keys[1]);
                if (a > b && a == b+1) {
                    return ['3,3', a];
                } else if (a < b && a+1 == b) {
                    return ['3,3', b];
                }
            }
        } else {
            //多点牌
            var keys = [];
            for (var k in cardCount) {
                keys.push(parseInt(k));
            }
            keys.sort(function(a, b){
                if (a>b)
                    return 1;
                else 
                    return -1;
            });
            var c = keys.length;
            var count = [];
            for (var key in cardCount) {
                count.push(cardCount[key]);
            }
            count = count.sort().toString();
            if (/^[1,]{9,}$/.test(count)) {
                //单顺子 34567 - 456789
                for (var i=1; i<c; i++) {
                    if (parseInt(keys[i-1])+1 != parseInt(keys[i])) {
                        return false;
                    }
                }
                return ["11,"+c, keys[c-1]];
            } else if (/^[2,]{5,}$/.test(count)) {
                //双顺子 334455 - 4455667788
                for (var i=1; i<c; i++) {
                    if (parseInt(keys[i-1])+1 != parseInt(keys[i]))
                        return false;
                }
                return ["22,"+c, keys[c-1]];
            }
        }
        return false;
    },
    /**
     * 机器智能选牌逻辑
     * ======
     * @param {Array} underCard 底牌卡组
     * @param {Array} pileCard  手牌卡组
     * ======
     * @return {Array} 选中的卡牌索引
     */
    robotAI: function(underCard, pileCard){
        var result = [];
        var pileCardWeight = {};
        for (var i in pileCard) {
            pileCardWeight[pileCard[i]] = this.cardWeight[pileCard[i]];
        }
        var digits = [];
        for (var k in pileCardWeight) {
            digits.push(pileCardWeight[k]);
        }
        digits.sort(function(a, b){
            if (a > b) {
                return 1;
            } else {
                return -1;
            }
        });
        if (underCard == null) {
            var d = digits[0];
            for (var k in pileCardWeight) {
                if (pileCardWeight[k] == d) {
                    if (result.length < 4) {
                        result.push(k);
                    } else {
                        result = [];
                        d = pileCardWeight[k];
                        result.push(k);
                    }
                }
            }
        } else {
            //单花色
            if (underCard[0].length == 1) {
                var ul = parseInt(underCard[0]); //张数
                var ud = parseInt(underCard[1]); //点数
                var td = 0, c = 1;
                for (var i of digits) {
                    if (i <= ud) {
                        continue;
                    }
                    if (td == i) {
                        c++;
                    } else if (td < i) {
                        td = i;
                        c = 1;
                    }
                    if (c == ul) {
                        break;
                    }
                }
                if (c == ul) {
                    for (var k in pileCardWeight) {
                        if (pileCardWeight[k] == td) {
                            result.push(k);
                            if (--c == 0)
                                break;
                        }
                    }
                }
            }
        }
        return result;
    },
    ctor: function(){}
});