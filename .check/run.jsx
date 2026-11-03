import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import PrintableBuildCards from '@/components/admin/PrintableBuildCards';
import { deriveBuildCards } from '@/lib/buildCards';
import items from './items.json';

const cards = deriveBuildCards(items, {});
const html = renderToStaticMarkup(<PrintableBuildCards cards={cards} order={[]} paper="letter" perPage={3} />);
console.log('html bytes', html.length, 'cards', cards.length);
cards.slice(0, 5).forEach(c => console.log('card', c.print_name, '| in:', c.in_shake.length, 'top:', c.toppings.length));
console.log('has fluff text:', html.includes('Marshmallow Fluff'));
console.log('see square count:', (html.match(/See Square/g) || []).length);
console.log('IN THE SHAKE count:', (html.match(/IN THE SHAKE/g) || []).length);