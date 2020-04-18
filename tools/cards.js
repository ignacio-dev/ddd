const fs = require('fs');


const JSON_FILE = fs.readFileSync('./json/cards.json', 'utf8');
const CARDS = [];


function newCardStack(room) {
	const cards_data = JSON.parse(JSON_FILE);
	const card_stack = { cards_data, room };
	shuffle(card_stack.cards_data);
	CARDS.push(card_stack);
}


function drawCard(room) {
	const index = CARDS.findIndex(stack => stack.room === room);
	if (index !== -1) {
		return CARDS[index].cards_data.shift();
	}
}


function getRoomCards(room) {
	return CARDS.filter(card_stack => card_stack.room === room);
}


function shuffle(card_stack) {
	card_stack.sort(() => Math.random() - 0.5);
}

function getPreCacheData() {
	const cards_data = JSON.parse(JSON_FILE);
	const precacher = [];
	for (let card of cards_data) {
		precacher.push({name: card.name, type: card.type});
	}
	return precacher;
}

function pickLoserCard() {
	let jsonFile = fs.readFileSync('./json/forfeit.json', 'utf8');
	let cards = JSON.parse(jsonFile);
	shuffle(cards);
	return cards[0];
}


module.exports = {
	CARDS,
	newCardStack,
	drawCard,
	getRoomCards,
	getPreCacheData,
	pickLoserCard
};