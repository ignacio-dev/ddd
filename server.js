// NATIVE MODULES
const http = require('http');
const path = require('path');


// THIRD PARTY MODULES
const express  = require('express');
const socketio = require('socket.io');


// CUSTOM MODULES
const {
	playerJoin,
	getCurrentPlayer,
	playerLeave,
	getRoomPlayers,
	nextPlayer,
	attachCard,
	getRoomModerator,
	getRoomLoser,
	useCardMessage,
	stealCard,
	removeCard,
	swapCard,
	resetRoomStateCards,
	removeRule
} = require('./tools/players');

const {
	CARDS,
	newCardStack,
	drawCard,
	getRoomCards,
	getPreCacheData,
	pickLoserCard
} = require('./tools/cards');

function sendHeartbeat() {
	setTimeout(sendHeartbeat, 8000);
	IO.sockets.emit('ping', { beat: 1 });
}

// APP & SERVER
const APP    = express();
const SERVER = http.createServer(APP);
const PORT   = process.env.PORT || 3000;
const IO     = socketio(SERVER, {
	pingInterval: 10000
});


// STATIC FOLDER
APP.use(express.static(path.join(__dirname,'public'), { maxAge: 86400000 }));


// SOCKETS
IO.on('connection', socket => {
	// JOIN ROOM
	socket.on('joinRoom', ({ nickname, room, avatar }) => {
		const room_players = getRoomPlayers(room);

		var init = false;
		if (room_players.length === 0) {
			newCardStack(room);
			init = true;
		}

		const player = playerJoin(socket.id, nickname, room, avatar);
		if (player) {

			socket.join(player.room);

			socket.emit('playerId', {
				playerId: player.id
			});

			IO.to(player.room).emit('roomData', {
				room: player.room,
				players: getRoomPlayers(player.room),
				cards: getRoomCards(player.room)[0].cards_data
			});

			if (init === true) {
				socket.emit('turn');
				socket.emit('animationOverResp');
				socket.emit('stopWatchPermits');
				socket.emit('init');
			}

		}
	});
	console.log(socket);

	// IMG PRE CACHE
	socket.on('imgPreCacheReq', () => {
		const precache_data = getPreCacheData();
		if (precache_data) {
			socket.emit('preCacheImgs', precache_data);
		}	
	});


	// DRAW CARD
	socket.on('drawCard', room => {
		const card = drawCard(room);
		if (card) {
			socket.emit('cardDrawn', card);

			IO.to(room).emit('roomData', {
				room: room,
				players: getRoomPlayers(room),
				cards: getRoomCards(room)[0].cards_data
			});	

			if (getRoomCards(room)[0].cards_data.length === 0) {
				IO.to(room).emit('endGame');
			}
		}
		
	});

	// ACTION CARD
	socket.on('actionCard', ({ card, room }) => {
		IO.to(room).emit('discardAction', {
			card
		});
	});

	// RULE CARD
	socket.on('placeRule', ({ card, room }) => {
		IO.to(room).emit('rulePlaced', { card });
	});

	socket.on('mustReplaceRule', ({ card, room }) => {
		socket.emit('ruleReplaceMsg', { card });
	});

	socket.on('replaceRule', ({ num, card, room }) => {
		IO.to(room).emit('ruleReplaced', { num, card });
	});


	// SATE CARD
	socket.on('stateCard', ({ card, room, local_id }) => {
		attachCard(room, socket.id, card);
		IO.to(room).emit('roomData', {
			room: room,
			players: getRoomPlayers(room),
			cards: getRoomCards(room)[0].cards_data,
			card
		});

		IO.to(room).emit('stateAttached', { card, id: local_id });
	});

	// NEXT PLAYER
	socket.on('reqNextPlayer', room => {
		const currentPlayer = getCurrentPlayer(socket.id);
		if (currentPlayer) {
			const nextPlayerId = nextPlayer(socket.id);
			IO.to(room).emit('roomData', {
				room: room,
				players: getRoomPlayers(room),
				cards: getRoomCards(room)[0].cards_data
			});
			IO.to(nextPlayerId).emit('turn');
		}
		
	});

	// START WATCH
	socket.on('startTimerReq', room => {
		IO.to(room).emit('startTimer');
	});

	// TIMEOUT
	socket.on('timeOut', room => {
		IO.to(room).emit('everyoneDrinks');
		// const moderator = getRoomModerator(room);
		// IO.to(moderator.id).emit('stopWatchPermits');
	});

	// I DRANK
	socket.on('iDrank', () => {
		const player = getCurrentPlayer(socket.id);
		if (player) {
			if (player.drinks < 99) player.drinks += 1;
			IO.to(player.room).emit('playerDrank', {
				player: player.nickname,
				drinks: player.drinks
			});

			IO.to(player.room).emit('roomData', {
				room: player.room,
				players: getRoomPlayers(player.room),
				cards: getRoomCards(player.room)[0].cards_data
			});
		}
		
	});

	// USE CARD
	socket.on('useCardReq', ({card, player, room}) => {
		let _player  = getCurrentPlayer(player);
		if (_player) {
			let response = useCardMessage(_player, card);
			socket.emit('useCardResp', response);
		}
		
	});

	socket.on('steal', ({ targetPlayer, cardName, cardType, specialCard }) =>  {
		let playerOrig = getCurrentPlayer(socket.id);
		if (playerOrig){
			let playerTarg = getCurrentPlayer(targetPlayer);
			let room = playerOrig.room;
			stealCard(playerOrig, playerTarg, cardName, cardType, specialCard);
			let card = {
				name: cardName,
				type: cardType == 'power' ? 'Power' : 'Weakness',
				stolen: true
			};

			IO.to(room).emit('roomData', {
				room,
				players: getRoomPlayers(room),
				cards: getRoomCards(room)[0].cards_data,
				card
			});
			IO.to(room).emit('specialCardUsed', { playerOrig, playerTarg, specialCard });
			//IO.to(room).emit('cardStolen');
		}
	});

	socket.on('remove', ({ targetPlayer, cardName, cardType, specialCard }) => {
		let playerOrig = getCurrentPlayer(socket.id);
		if (playerOrig) {
			let playerTarg = getCurrentPlayer(targetPlayer);
			let room = playerOrig.room;
			removeCard(playerOrig, playerTarg, cardName, cardType, specialCard);

			IO.to(room).emit('roomData', {
				room,
				players: getRoomPlayers(room),
				cards: getRoomCards(room)[0].cards_data
			});
			IO.to(room).emit('specialCardUsed', { playerOrig, playerTarg, specialCard });
			//IO.to(room).emit('disarmed');
		}
		
	});

	socket.on('anarchy', cardName => {
		let playerOrig = getCurrentPlayer(socket.id);
		if (playerOrig) {
			let room = playerOrig.room;
			let specialCard = cardName;
			resetRoomStateCards(room, cardName, playerOrig);
			IO.to(room).emit('roomData', {
				room,
				players: getRoomPlayers(room),
				cards: getRoomCards(room)[0].cards_data,
				remove_rules: true
			});
			IO.to(room).emit('specialCardUsed', { playerOrig, specialCard });
		}
	});

	socket.on('expelliarmus', ({ targetPlayer, cardName, cardType, specialCard }) => {
		if (!targetPlayer) {
			let playerOrig = getCurrentPlayer(socket.id);
			if (playerOrig) {
				let room = playerOrig.room;
				removeRule(playerOrig, specialCard);
				IO.to(room).emit('roomData', {
					room,
					players: getRoomPlayers(room),
					cards: getRoomCards(room)[0].cards_data,
					ruleRemove: cardName
				});
				IO.to(room).emit('specialCardUsed', { playerOrig, specialCard });
			}	
		}
		else {
			let playerOrig = getCurrentPlayer(socket.id);
			if (playerOrig) {
				let playerTarg = getCurrentPlayer(targetPlayer);
				let room = playerOrig.room;
				removeCard(playerOrig, playerTarg, cardName, cardType, specialCard);

				IO.to(room).emit('roomData', {
					room,
					players: getRoomPlayers(room),
					cards: getRoomCards(room)[0].cards_data
				});
				IO.to(room).emit('specialCardUsed', { playerOrig, playerTarg, specialCard });

			}
			
		}

	});

	socket.on('showSpecialReq', card => {
		let playerOrig = getCurrentPlayer(socket.id);
		if (playerOrig) {
			let room = playerOrig.room;
			removeRule(playerOrig, card);
			IO.to(room).emit('roomData', {
				room,
				players: getRoomPlayers(room),
				cards: getRoomCards(room)[0].cards_data
			});
			let specialCard = card;
			IO.to(room).emit('specialCardUsed', { playerOrig, specialCard });
		}
		

	});

	socket.on('swap', ({ targetPlayer, cardName, cardType, specialCard, myCardName, myCardType }) => {
		let playerOrig = getCurrentPlayer(socket.id);
		if (playerOrig) {
			let playerTarg = getCurrentPlayer(targetPlayer);
			let room = playerOrig.room;
			swapCard(playerOrig, playerTarg, cardName, cardType, specialCard, myCardName, myCardType);

			IO.to(room).emit('roomData', {
				room,
				players: getRoomPlayers(room),
				cards: getRoomCards(room)[0].cards_data
			});

			IO.to(room).emit('specialCardUsed', { playerOrig, playerTarg, specialCard });	
		}
		
	});

	// GAME OVER
	socket.on('endGameReq', (room) => {
		const loser = getRoomLoser(room);
		if (loser) {
			IO.to(room).emit('loser');
			// socket.emit('endGame');
		}
		
	});

	socket.on('loserMsgReq', room => {
		const loser = getRoomLoser(room);
		if (loser) {
			IO.to(room).emit('loserMsg', loser);
		}
		
	});

	socket.on('loserCardSelected', num => {
		const player = getCurrentPlayer(socket.id);
		if (player) {
			let loserCard = pickLoserCard();
			IO.to(player.room).emit('showLoserCard', { num, loser_card: loserCard });	
		}
		
	});

	// DISCONNECT
	socket.on('disconnect', () => {
		const player = getCurrentPlayer(socket.id);
		if (player) {
			if (player.turn) {
				const nextPlayerId = nextPlayer(player.id);
				IO.to(nextPlayerId).emit('turn');
				if (player.moderator) {
					IO.to(nextPlayerId).emit('stopWatchPermits');
				}
				playerLeave(player.id);
			}

			else {
				playerLeave(player.id);
			}
			IO.to(player.room).emit('roomData', {
				room: player.room,
				players: getRoomPlayers(player.room),
				cards: getRoomCards(player.room)[0].cards_data
			});
		}
	});
});

// SERVER LISTEN
SERVER.listen(PORT, () => {
	if (PORT === 3000) {
		console.log(`Listening on port ${PORT}`);
	}	
});