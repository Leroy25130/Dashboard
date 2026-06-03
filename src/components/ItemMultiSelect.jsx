import MultiSelect from './MultiSelect';

export default function ItemMultiSelect({ items, selected, onChange, label = 'Item Number:' }) {
  return <MultiSelect options={items} selected={selected} onChange={onChange} label={label} allLabel="All items" />;
}
