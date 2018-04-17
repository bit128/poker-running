/**
 * 背景层
 * ======
 * @property {cc.Sprite}    pokerBackground     卡牌堆精灵
 * ======
 * @author 洪波
 * @version 18.04.10
 */
var BackgroundLayer = cc.Layer.extend({
    pokerBackground: null,
    ctor:function () {
        this._super();
        var background = new cc.Sprite("res/background.jpg");
        this.addChild(background);
        background.setPosition(cc.winSize.width/2, cc.winSize.height/2);
        return true;
    }
});

/**
 * 扑克层
 * ======
 * @property {cc.Class}     pokerOrder          卡牌规则类
 * @property {cc.Node}      pileNode            卡牌堆
 * @property {Object}       underCard           桌面底牌（上一家出牌）
 * @property {Array}        mpSelect            主角玩家已选卡牌
 * @property {Array}        mp                  主角玩家手牌
 * @property {Array}        rp                  机器1玩家手牌
 * @property {Array}        lp                  机器2玩家手牌
 * @property {cc.Node}      mpNode              主角手牌父节点
 * @property {cc.Node}      rpNode              机器1玩家手牌父节点
 * @property {cc.Node}      lpNode              机器2玩家手牌父节点
 * @property {cc.Sprite}    senderNode          发牌精灵动画节点
 * @property {Interval}     senderInterval      循环发牌定时器
 * @property {int}          sendStartIndex      发牌顺序
 * @property {int}          putStartIndex       出牌顺序
 * @property {int}          putEnd              过牌标记（记录最后一次出牌人）
 * ======
 * @author 洪波
 * @version 18.04.10
 */
var PokerLayer = cc.Layer.extend({
    pokerOrder:         null,
    pileNode:           null,
    underCard:          null,
    mpSelect:           [],
    mp:                 [],
    rp:                 [],
    lp:                 [],
    mpNode:             null,
    rpNode:             null,
    lpNode:             null,
    senderNode:         null,
    senderInterval:     null,
    sendStartIndex:     0,
    putStartIndex:      -1,
    putEnd:             -1,
    ctor: function(){
        this._super();
        this.pokerOrder = new PokerOrder();
        //卡牌堆节点
        this.pileNode = new cc.Node();
        this.addChild(this.pileNode);
        //加载手牌节点
        this.mpNode = new cc.Node();
        this.addChild(this.mpNode);
        this.lpNode = new cc.Node();
        this.addChild(this.lpNode);
        this.rpNode = new cc.Node();
        this.addChild(this.rpNode);
        //手牌节点位置
        this.lpNode.attr({
            rotation: -90,
            x: cc.winSize.width/2-300,
            y: cc.winSize.height/2+100
        });
        this.rpNode.attr({
            rotation: -90,
            x: cc.winSize.width/2+300,
            y: cc.winSize.height/2+100
        });
        //加载操作按钮
        //出牌
        this.sendBtn = new ccui.Button("res/send-normal.png","res/send-pressed.png","");
        this.addChild(this.sendBtn);
        this.sendBtn.attr({
            name: "sendBtn",
            x: cc.winSize.width/2+110,
            y: cc.winSize.height/2-460
        });
        this.sendBtn.addTouchEventListener(this.onButtonTouchEvent, this);
        //过牌
        this.passBtn = new ccui.Button("res/pass-normal.png","res/pass-pressed.png","");
        this.addChild(this.passBtn);
        this.passBtn.attr({
            name: "passBtn",
            x: cc.winSize.width/2-190,
            y: cc.winSize.height/2-460
        });
        this.passBtn.addTouchEventListener(this.onButtonTouchEvent, this);
        return true;
    },
    /**
     * 操作按钮点击事件
     */
    onButtonTouchEvent: function(sender, type){
        if (this.putStartIndex == 0) {
            switch (type) {
                case ccui.Widget.TOUCH_BEGAN:
                    if (sender.name == 'sendBtn') {
                        cc.audioEngine.playEffect("res/Select.mp3");
                    } else if (sender.name == 'passBtn') {
                        cc.audioEngine.playEffect("res/Unlock.mp3");
                    }
                    break;
                case ccui.Widget.TOUCH_ENDED:
                    if (sender.name == 'sendBtn') {
                        this.putCard();
                    } else if (sender.name == 'passBtn') {
                        if (this.putEnd == -1) {
                            this.putEnd = 2;
                        }
                        this.putStartIndex = 1;
                        this.putCardFromRobot();
                        var node = new cc.LabelTTF("Pass", "Arial", 40);
                        this.pileNode.addChild(node);
                        node.setColor(cc.color(255, 200, 10));
                        node.attr({
                            x: cc.winSize.width / 2,
                            y: cc.winSize.height / 2 - 80
                        });
                    }
                    break;
            }
        }
    },
    /**
     * 开始新游戏
     */
    newGame: function(){
        this.pileNode.removeAllChildren();
        this.underCard = null;
        this.mpSelect = [];
        this.mp = [];
        this.rp = [];
        this.lp = [];
        this.mpNode.removeAllChildren();
        this.rpNode.removeAllChildren();
        this.lpNode.removeAllChildren();
        //发牌逻辑
        this.sendPoker();
    },
    /**
     * 出牌
     */
    putCard: function(){
        var mpc = this.mpSelect.length;
        if (this.putEnd == this.putStartIndex) {
            this.putEnd = -1;
            this.underCard = null;
        }
        var cardList = [];
        for (var i in this.mpSelect) {
            cardList.push(this.mpSelect[i].name);
        }
        var stack = this.pokerOrder.countDigit(cardList);
        if (stack) {
            if (this.underCard != null) {
                if (this.underCard[0] != stack[0]) {
                    cc.log('Error: 点数类型不一致');
                    return false;
                }
                if (this.underCard[1] >= stack[1]) {
                    cc.log('Error: 点数太小');
                    return false;
                }
            }
            //出牌动作
            this.pileNode.removeAllChildren();
            var step = 36;
            var offset = -(step / 2 * mpc);
            for (var i in this.mpSelect) {
                var node = this.mpSelect[i];
                //出牌后从原卡组中移除
                this.mp.splice(this.mp.indexOf(node.name), 1);
                node.removeFromParent();
                //新建卡牌精灵
                node = new cc.Sprite("#"+node.name+".png");
                this.pileNode.addChild(node);
                node.attr({
                    x: cc.winSize.width / 2 + offset + step,
                    y: cc.winSize.height / 2,
                    scale: 0.6
                });
                offset += step;
            }
            this.underCard = stack;
            this.putEnd = -1;
            this.mpSelect = [];
            cc.log('--> 出牌成功:', stack);
            if (this.mp.length > 0) {
                this.putStartIndex = 1;
                this.putCardFromRobot();
            } else {
                this.winner(0);
            }
            return true;
        } else {
            return false;
        }
    },
    /**
     * 出牌-机器玩家
     */
    putCardFromRobot: function(){
        if (this.putStartIndex > 0) {
            var that = this;
            var interval = setInterval(function(){
                var hp,cardNode;
                var position = 0;
                if (that.putEnd == that.putStartIndex) {
                    that.putEnd = -1;
                    that.underCard = null;
                }
                if (that.putStartIndex == 1) {
                    hp = that.rp;
                    cardNode = that.rpNode;
                    position = 100;
                    //转到下一机器玩家
                    cc.log('-->机器玩家: ',that.putStartIndex,' 出牌');
                    that.putStartIndex = 2;
                } else if (that.putStartIndex == 2) {
                    hp = that.lp;
                    cardNode = that.lpNode;
                    position = -100;
                    //转到主角玩家
                    cc.log('-->机器玩家: ',that.putStartIndex,' 出牌');
                    that.putStartIndex = 0;
                    clearInterval(interval);
                }
                var cards = that.pokerOrder.robotAI(that.underCard, hp);
                //机器玩家出牌
                if (cards.length > 0) {
                    var stack = that.pokerOrder.countDigit(cards);
                    if(! stack) {
                        cc.log(cards);
                    }
                    that.underCard = stack;
                    that.putEnd = -1;
                    //出牌动作
                    that.pileNode.removeAllChildren();
                    var step = 30;
                    var offset = -(step / 2 * cards.length);
                    for (var item of cards) {
                        //出牌后从原卡组中移除
                        hp.splice(hp.indexOf(item), 1);
                        var node = new cc.Sprite("#"+item+".png");
                        that.pileNode.addChild(node);
                        node.attr({
                            x: cc.winSize.width / 2 + offset + step + position,
                            y: cc.winSize.height / 2 + 200,
                            scale: 0.5
                        });
                        offset += step;
                    }
                    //减少卡牌动作
                    for (var i=0; i<cards.length; i++) {
                        cardNode.children[cardNode.children.length-1].removeFromParent();
                    }
                    cc.log('----> put card: ', stack);
                    //判断是否出完卡牌
                    if (hp.length == 0) {
                        if (that.putStartIndex == 0) {
                            that.winner(2);
                        } else {
                            that.winner(1);
                        }
                        clearInterval(interval);
                    }
                    //出牌声效
                    cc.audioEngine.playEffect("res/Select.mp3");
                } else {
                    //过牌逻辑
                    if (that.putEnd == -1) {
                        if (that.putStartIndex == 0) {
                            that.putEnd = 1;
                        } else {
                            that.putEnd = 0;
                        }
                    }
                    var node = new cc.LabelTTF("Pass", "Arial", 30);
                    that.pileNode.addChild(node);
                    node.setColor(cc.color(255, 200, 10));
                    node.attr({
                        x: cc.winSize.width / 2 + position * 1.5,
                        y: cc.winSize.height / 2 + 200
                    });
                    //过牌声效
                    cc.audioEngine.playEffect("res/Unlock.mp3");
                    cc.log('----> pass. ');
                }
            }, 2000);
        }
    },
    /**
     * 开始新一轮发牌
     */
    sendPoker: function(){
        var pokerBackground = new cc.Sprite("#pb.png");
        this.pileNode.addChild(pokerBackground);
        pokerBackground.attr({
            x: cc.winSize.width/2,
            y: cc.winSize.height/2+100,
            scale: 0.6
        });
        cc.log('--> 开始发牌');
        var that = this;
        var i = this.sendStartIndex;
        var cardList = this.pokerOrder.cardList.slice(0);
        this.interval = setInterval(function(){
            if (cardList.length > 0) {
                var pid = Math.floor(Math.random() * cardList.length + 1)-1;
                var card = cardList[pid];
                if (i == 0) {
                    //发给我自己
                    that.sendCardToMe(card);
                } else {
                    //发给机器玩家
                    that.sendCardToRobot(card, i);
                }
                cardList.splice(pid, 1);
                //首次游戏出牌顺序
                if (card == 'b3' && that.putStartIndex == -1) {
                    that.putStartIndex = i;
                }
            } else {
                clearInterval(that.interval);
                that.sendCardFinish();
                that.pileNode.removeAllChildren();
            }
            if (++i > 2) {
                i = 0;
            }
        }, 240);
    },
    /**
     * 发牌给我
     * ======
     * @param {String}      card    卡牌花色 
     */
    sendCardToMe: function(card){
        this.mp.push(card);
        var mpc = this.mp.length;
        var offset = 0;
        var margin = 36; //卡牌间距
        //插牌动作
        var that = this;
        var insertAction = cc.callFunc(function(){
            that.mpNode.removeAllChildren();
            for (var i=0; i<mpc; i++) {
                var node = new cc.Sprite("#"+that.mp[i]+".png");
                node.setScale(0.6);
                that.mpNode.addChild(node);
                if (offset > 0) {
                    node.setPositionX(node.x+offset);
                }
                offset += margin;
            }
            that.mpNode.attr({
                x: cc.winSize.width / 2 - offset/2.14,
                y: cc.winSize.height / 2 - 240
            });
        });
        //发牌动作
        if (this.senderNode == null) {
            this.senderNode = new cc.Sprite("#pb.png");
            this.addChild(this.senderNode);
        }
        this.senderNode.attr({
            x: cc.winSize.width/2,
            y: cc.winSize.height/2+100,
            scale: 0.6,
            rotation: 0
        });
        var action = cc.moveBy(0.2, mpc*margin/1.88-margin, -340);
        this.senderNode.runAction(cc.sequence(cc.show(), action, cc.hide(), insertAction));
    },
    /**
     * 发牌给机器玩家
     * ======
     * @param {String}      card    卡牌花色
     * @param {int}         index   机器玩家索引
     */
    sendCardToRobot: function(card, index){
        var pc = 0;
        var offset = 0;
        var margin = 20;
        var parent = null;
        if (index == 1) {
            this.rp.push(card);
            pc = this.rp.length;
            parent = this.rpNode;
        } else {
            this.lp.push(card);
            pc = this.lp.length;
            parent = this.lpNode;
        }
        //插牌动作
        var insertAction = cc.callFunc(function(){
            parent.removeAllChildren();
            for (var i=0; i<pc; i++) {
                var node = new cc.Sprite("#pb.png");
                node.setScale(0.4);
                parent.addChild(node);
                if (offset > 0) {
                    node.setPositionX(node.x+offset);
                }
                offset += margin;
            }
        }.bind(this));
        //发牌动画
        if (this.senderNode == null) {
            this.senderNode = new cc.Sprite("#pb.png");
            this.addChild(this.senderNode);
        }
        this.senderNode.attr({
            x: cc.winSize.width/2,
            y: cc.winSize.height/2+100,
            scale: 0.4,
            rotation: -90
        });
        var action = cc.moveBy(0.2, index==1?300:-260, 180);
        this.senderNode.runAction(cc.sequence(cc.show(), action, insertAction, cc.hide()));
    },
    /**
     * 结束发牌
     */
    sendCardFinish: function(){
        //卡牌点选事件监听
        var that = this;
        var listener = cc.EventListener.create({
            event: cc.EventListener.TOUCH_ONE_BY_ONE,
            swallowTouched: true,
            target: this,
            onTouchBegan: function(touch, event){
                var target = event.getCurrentTarget();
                var posInNode = target.convertToNodeSpace(touch.getLocation());
                var size = target.getContentSize();
                var rect = cc.rect(0, 0, 68, size.height);
                if (! cc.rectContainsPoint(rect, posInNode)) {
                    return false;
                }
                return true;
            },
            onTouchEnded: function(touch, event){
                var node = event.getCurrentTarget();
                var select = false;
                for (var i in that.mpSelect) {
                    if (that.mpSelect[i].name == node.name) {
                        select = true;
                        that.mpSelect.splice(i,1);
                        break;
                    }
                }
                if (select) {
                    node.runAction(cc.moveBy(0.1, 0, -100));
                } else {
                    that.mpSelect.push(node);
                    node.runAction(cc.moveBy(0.1, 0, 100));
                }
            }
        });
        //排序规则
        var s = ['2','a','k','q','j','1','9','8','7','6','5','4','3'];
        this.mp.sort(function(a,b){
            if (s.indexOf(a[1]) > s.indexOf(b[1]))
                return 1;
            else
                return -1;
        });
        //按顺序渲染卡牌组
        var mpc = this.mp.length;
        var offset = 0;
        var margin = 36;
        this.mpNode.removeAllChildren();
        for (var i=0; i<mpc; i++) {
            var node = new cc.Sprite("#"+this.mp[i]+".png");
            this.mpNode.addChild(node);
            node.attr({
                name: this.mp[i],
                scale: 0.6
            });
            if (i == 0) {
                cc.eventManager.addListener(listener, node);
            } else {
                cc.eventManager.addListener(listener.clone(), node);
            }
            if (offset > 0) {
                node.setPositionX(node.x+offset);
            }
            offset += margin;
        }
        if (this.putStartIndex > 0) {
            this.putCardFromRobot();
        }
        if (this.putStartIndex == 0) {
            var that = this;
            setTimeout(function(){
                var node = new cc.LabelTTF("您先出牌", "Arial", 40);
                node.setColor(cc.color(255, 200, 10));
                node.attr({
                    x: cc.winSize.width / 2,
                    y: cc.winSize.height / 2 - 80
                });
                that.pileNode.addChild(node);
            }, 500);
            
        }
        cc.log('--> 首次出牌玩家：', this.putStartIndex);
    },
    /**
     * 获胜
     * ======
     * @param {int} player 赢家编号
     */
    winner: function(player){
        var text,x,y;
        switch(player) {
            case 0:
                text = "您获得了胜利";
                break;
            case 1:
                text = "机器玩家1获得了胜利";
                break;
            case 2:
                text = "机器玩家2获得了胜利";
                break;
        }
        var node = new cc.LabelTTF(text, "Arial", 40);
        this.pileNode.addChild(node);
        node.setColor(cc.color(220, 60, 10));
        node.attr({
            x: cc.winSize.width / 2,
            y: cc.winSize.height / 2 + 100
        });
        this.putStartIndex = -1;
    }
});



/**
 * 游戏场景
 * ======
 * @property {cc.Layer}     backgroundLayer     背景层
 * @property {cc.Layer}     pokerLayer          游戏主层
 * ======
 * @author 洪波
 * @version 18.04.10
 */
var MainScene = cc.Scene.extend({
    backgroundLayer: null,
    pokerLayer: null,
    ctor: function(){
        this._super();
        // 载入扑克资源
        cc.spriteFrameCache.addSpriteFrames(res.Poker_plist, res.Poker_png);
        cc.spriteFrameCache.addSpriteFrames(res.Poker2_plist, res.Poker2_png);
    },
    onEnter: function(){
        this._super();
        //加载背景层
        this.backgroundLayer = new BackgroundLayer();
        this.addChild(this.backgroundLayer);
        //加载游戏场景
        this.pokerLayer = new PokerLayer();
        this.addChild(this.pokerLayer);
        //开始游戏
        this.pokerLayer.newGame();
    }
});