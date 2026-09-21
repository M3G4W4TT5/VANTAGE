import { useId } from 'react';
import type { ReactNode } from 'react';
import { UiIcon } from './UiIcon';
import styles from './ResultsDock.module.css';

export function ResultsDock({ title, count, summary, list, open, toggle, children }: {
  title: string; count: number; summary: ReactNode; list: boolean; open: boolean; toggle(): void; children: ReactNode;
}) {
  const id = useId();
  const heading = <><strong>{title} <span>{count}</span></strong><span className={styles.summary}>{summary}</span></>;
  return <section className={styles.dock} data-list={list} data-open={open} aria-label={`${title} results panel`}>
    {list ? <div className={styles.header}>{heading}</div> :
      <button className={styles.header} aria-expanded={open} aria-controls={id} onClick={toggle}>
        {heading}<UiIcon name={open ? 'down' : 'up'} />
      </button>}
    {(list || open) && <div id={id} className={styles.content}>{children}</div>}
  </section>;
}
