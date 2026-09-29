import React from 'react';
import SmashieKnowledgeItem from './SmashieKnowledgeItem';

export const INITIAL_TOPICS = [
  { id: 'history', title: 'Flavor Isle history', content: 'Flavor Isle started as a small Smiths Grove burger joint focused on fresh, never-frozen hand-patted burgers and thick shakes. It grew into a local favorite while keeping the same made-fresh approach.', enabled: true },
  { id: 'directions', title: 'Directions', content: 'We are at 103 N Main St in Smiths Grove, on the main drag. From I-65, take exit 38 toward Smiths Grove and turn onto N Main St. Parking is available out front.', enabled: true },
];

export default function SmashieKnowledge({ topics = [], onChange }) {
  return <section className="card-diner p-5 space-y-4">
    <div><h3 className="font-heading text-obsidian-roast">What Smashie knows</h3>
      <p className="text-sm text-muted-foreground">Edit his history, directions and other facts. Live menu, prices, hours and wait times always come from the store, not these notes.</p></div>
    {topics.map(topic => <SmashieKnowledgeItem key={topic.id} topic={topic}
      onChange={next => onChange(topics.map(t => t.id === topic.id ? next : t))}
      onDelete={() => onChange(topics.filter(t => t.id !== topic.id))} />)}
    <button type="button" onClick={() => onChange([...topics, { id: crypto.randomUUID(), title: '', content: '', enabled: true }])}
      className="min-h-11 btn-mint px-5">Add knowledge topic</button>
  </section>;
}