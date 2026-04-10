import { useEffect, useMemo, useState } from 'react';
import { CopyPlus, Loader2, PlusCircle, RefreshCcw, Save, Trash2 } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiClient, withApiOrigin } from '../api/client';
import { useSocketSync } from '../hooks/useSocketSync';
import { AssetUploader } from '../components/course/AssetUploader';

const colorPalette = ['#2e6ca5', '#1aa9a1', '#f0b13b', '#e64b67'];

const textToList = (value) => String(value || '').split(/\n|,/).map((item) => item.trim()).filter(Boolean);
const listToText = (list) => (list || []).join('\n');
const tagsToText = (list) => (list || []).join(', ');
const textToTags = (value) => String(value || '').split(',').map((item) => item.trim()).filter(Boolean);
const statsToText = (stats = []) => stats.map((item) => `${item.value} | ${item.label}`).join('\n');
const textToStats = (value) => String(value || '').split('\n').map((line) => {
  const [left, ...rest] = line.split('|');
  return { value: (left || '').trim(), label: rest.join('|').trim() };
}).filter((item) => item.value || item.label);

function makeAttachment() {
  return { id: `tmp-${Math.random().toString(36).slice(2, 9)}`, title: '', url: '', type: 'pdf', description: '' };
}

function makeSection() {
  return { label: 'Module', value: '' };
}

function makeDay(dayNumber = 1) {
  return {
    dayNumber,
    dayType: 'Weekday',
    hours: '5h',
    title: `Day ${dayNumber}`,
    objective: '',
    sections: [makeSection()],
    primaryDeliverable: '',
    materials: [],
    tags: [],
  };
}

function makeWeek(weekNumber = 1) {
  return {
    weekNumber,
    phaseLabel: `Phase ${weekNumber}`,
    title: `Week ${weekNumber}`,
    summary: '',
    accent: colorPalette[(weekNumber - 1) % colorPalette.length],
    deliverables: [],
    days: [makeDay((weekNumber - 1) * 7 + 1)],
  };
}

function makeCourse() {
  return {
    id: '',
    slug: '',
    title: 'Untitled Course',
    category: 'General',
    level: 'Intermediate',
    status: 'draft',
    shortDescription: '',
    tagline: '',
    brochure: {
      eyebrow: 'NEW COURSE',
      headline: '',
      lead: '',
      strapTitle: '',
      strapText: '',
      pdfUrl: '',
      heroImageUrl: '',
      chips: [],
      audience: [],
      outcomes: [],
      differentiators: [],
      cadence: [],
      timeline: [],
    },
    stats: [],
    downloads: [],
    featuredScreens: [],
    weeks: [makeWeek(1)],
  };
}

function cloneCourse(value) {
  return JSON.parse(JSON.stringify(value));
}

function normaliseEditorForSave(editor) {
  return {
    ...editor,
    stats: editor.stats || [],
    brochure: {
      ...editor.brochure,
      chips: editor.brochure?.chips || [],
      audience: editor.brochure?.audience || [],
      outcomes: editor.brochure?.outcomes || [],
      differentiators: editor.brochure?.differentiators || [],
      cadence: editor.brochure?.cadence || [],
      timeline: (editor.brochure?.timeline || []).filter((item) => item.phase || item.title || item.description),
    },
    downloads: (editor.downloads || []).filter((item) => item.title && item.url),
    featuredScreens: (editor.featuredScreens || []).filter(Boolean),
    weeks: (editor.weeks || []).map((week, weekIndex) => ({
      ...week,
      weekNumber: weekIndex + 1,
      deliverables: (week.deliverables || []).filter(Boolean),
      days: (week.days || []).map((day, dayIndex) => ({
        ...day,
        dayNumber: day.dayNumber || weekIndex * 7 + dayIndex + 1,
        sections: (day.sections || []).filter((item) => item.label && item.value),
        materials: (day.materials || []).filter((item) => item.title && item.url),
        tags: (day.tags || []).filter(Boolean),
      })),
    })),
  };
}

function AttachmentEditor({ attachments = [], onChange, uploadFolder = 'courses' }) {
  const updateRow = (index, key, value) => {
    onChange(attachments.map((item, rowIndex) => rowIndex === index ? { ...item, [key]: value } : item));
  };
  const addRow = () => onChange([...(attachments || []), makeAttachment()]);
  const removeRow = (index) => onChange(attachments.filter((_, rowIndex) => rowIndex !== index));

  return (
    <div className="stack-rows">
      {attachments.map((item, index) => (
        <div className="attachment-row" key={item.id || index}>
          <input type="text" placeholder="Title" value={item.title || ''} onChange={(event) => updateRow(index, 'title', event.target.value)} />
          <input type="text" placeholder="URL" value={item.url || ''} onChange={(event) => updateRow(index, 'url', event.target.value)} />
          <input type="text" placeholder="Type" value={item.type || ''} onChange={(event) => updateRow(index, 'type', event.target.value)} />
          <input type="text" placeholder="Description" value={item.description || ''} onChange={(event) => updateRow(index, 'description', event.target.value)} />
          <AssetUploader
            label="Upload file"
            folder={uploadFolder}
            buttonText="Upload"
            onUploaded={(asset) => onChange(attachments.map((row, rowIndex) => rowIndex === index ? { ...row, url: asset.url, title: row.title || asset.name } : row))}
          />
          <button type="button" className="btn tiny danger-outline" onClick={() => removeRow(index)}><Trash2 size={14} /></button>
        </div>
      ))}
      <button type="button" className="btn small" onClick={addRow}><PlusCircle size={16} /> Add attachment</button>
    </div>
  );
}

function SectionEditor({ sections = [], onChange }) {
  const updateRow = (index, key, value) => onChange(sections.map((item, rowIndex) => rowIndex === index ? { ...item, [key]: value } : item));
  const addRow = () => onChange([...(sections || []), makeSection()]);
  const removeRow = (index) => onChange(sections.filter((_, rowIndex) => rowIndex !== index));
  return (
    <div className="stack-rows">
      {sections.map((section, index) => (
        <div className="attachment-row" key={`${section.label}-${index}`}>
          <input type="text" placeholder="Section label" value={section.label || ''} onChange={(event) => updateRow(index, 'label', event.target.value)} />
          <textarea rows="2" placeholder="Section content" value={section.value || ''} onChange={(event) => updateRow(index, 'value', event.target.value)} />
          <button type="button" className="btn tiny danger-outline" onClick={() => removeRow(index)}><Trash2 size={14} /></button>
        </div>
      ))}
      <button type="button" className="btn small" onClick={addRow}><PlusCircle size={16} /> Add section</button>
    </div>
  );
}

export function CourseBuilderPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [courses, setCourses] = useState([]);
  const [selectedSlug, setSelectedSlug] = useState(searchParams.get('course') || '');
  const [editingRef, setEditingRef] = useState('');
  const [editor, setEditor] = useState(makeCourse());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');

  const loadCourses = async (preferredSlug = selectedSlug) => {
    setLoading(true);
    setError('');
    try {
      const { data } = await apiClient.get('/admin/courses');
      setCourses(data);
      const resolved = preferredSlug && data.find((item) => item.slug === preferredSlug)
        ? preferredSlug
        : data[0]?.slug || '';
      if (resolved) {
        const selected = data.find((item) => item.slug === resolved);
        setSelectedSlug(resolved);
        setEditingRef(resolved);
        setEditor(cloneCourse(selected));
        setSearchParams({ course: resolved });
      } else {
        setSelectedSlug('');
        setEditingRef('');
        setEditor(makeCourse());
      }
    } catch (loadError) {
      setError(loadError?.response?.data?.message || loadError.message || 'Failed to load courses.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCourses(searchParams.get('course') || '');
  }, []);

  useSocketSync(true, {
    'courses:updated': () => void loadCourses(selectedSlug),
  });

  const selectedCourse = useMemo(() => courses.find((course) => course.slug === selectedSlug) || null, [courses, selectedSlug]);

  const selectCourse = (course) => {
    setSelectedSlug(course.slug);
    setEditingRef(course.slug);
    setEditor(cloneCourse(course));
    setSearchParams({ course: course.slug });
    setFlash('');
  };

  const createNewCourse = () => {
    const fresh = makeCourse();
    setSelectedSlug('');
    setEditingRef('');
    setEditor(fresh);
    setSearchParams({});
    setFlash('Creating a new course draft.');
  };

  const updateEditor = (updater) => setEditor((current) => typeof updater === 'function' ? updater(cloneCourse(current)) : updater);
  const updateBrochure = (key, value) => updateEditor((current) => ({ ...current, brochure: { ...current.brochure, [key]: value } }));

  const addWeek = () => updateEditor((current) => ({
    ...current,
    weeks: [...current.weeks, makeWeek(current.weeks.length + 1)],
  }));

  const updateWeek = (weekIndex, updater) => updateEditor((current) => ({
    ...current,
    weeks: current.weeks.map((week, index) => index === weekIndex ? updater(cloneCourse(week)) : week),
  }));

  const removeWeek = (weekIndex) => updateEditor((current) => ({
    ...current,
    weeks: current.weeks.filter((_, index) => index !== weekIndex).map((week, idx) => ({ ...week, weekNumber: idx + 1 })),
  }));

  const addDay = (weekIndex) => updateWeek(weekIndex, (week) => ({
    ...week,
    days: [...week.days, makeDay(week.days.length ? Math.max(...week.days.map((day) => day.dayNumber || 0)) + 1 : (week.weekNumber - 1) * 7 + 1)],
  }));

  const updateDay = (weekIndex, dayIndex, updater) => updateWeek(weekIndex, (week) => ({
    ...week,
    days: week.days.map((day, index) => index === dayIndex ? updater(cloneCourse(day)) : day),
  }));

  const removeDay = (weekIndex, dayIndex) => updateWeek(weekIndex, (week) => ({
    ...week,
    days: week.days.filter((_, index) => index !== dayIndex),
  }));

  const saveCourse = async () => {
    setSaving(true);
    setFlash('');
    setError('');
    try {
      const payload = normaliseEditorForSave(editor);
      let saved;
      if (editingRef) {
        const { data } = await apiClient.patch(`/admin/courses/${editingRef}`, payload);
        saved = data;
      } else {
        const { data } = await apiClient.post('/admin/courses', payload);
        saved = data;
      }
      setFlash('Course saved successfully.');
      await loadCourses(saved.slug);
    } catch (saveError) {
      setError(saveError?.response?.data?.message || saveError.message || 'Failed to save course.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="portal-page">
        <div className="fullscreen-center compact">
          <Loader2 className="spin" size={28} />
          <p>Loading course builder...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="portal-page course-builder-page">
      <div className="page-header-row">
        <div>
          <span className="eyebrow soft">COURSE BUILDER</span>
          <h1>Reusable education module</h1>
          <p>Create courses, edit brochure copy, attach PDFs and materials, and manage the day grid dynamically from one admin workspace.</p>
        </div>
        <div className="multi-action-row">
          <button type="button" className="btn" onClick={() => void loadCourses(selectedSlug)}><RefreshCcw size={16} /> Refresh</button>
          <button type="button" className="btn primary" onClick={saveCourse} disabled={saving}>
            {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />} Save course
          </button>
        </div>
      </div>

      {error ? <div className="alert-box error">{error}</div> : null}
      {flash ? <div className="alert-box info">{flash}</div> : null}

      <div className="builder-layout">
        <aside className="panel-card builder-sidebar">
          <div className="panel-head compact">
            <div>
              <span className="eyebrow soft">COURSES</span>
              <h3>Catalog</h3>
            </div>
            <button type="button" className="btn tiny primary" onClick={createNewCourse}><CopyPlus size={14} /> New</button>
          </div>
          <div className="builder-course-list">
            {courses.map((course) => (
              <button key={course.id} type="button" className={`builder-course-item ${selectedSlug === course.slug ? 'active' : ''}`} onClick={() => selectCourse(course)}>
                <strong>{course.title}</strong>
                <span>{course.status} · {course.durationDays} days</span>
              </button>
            ))}
          </div>
        </aside>

        <div className="builder-main-stack">
          <section className="panel-card stack-form">
            <div className="panel-head compact">
              <div>
                <span className="eyebrow soft">COURSE METADATA</span>
                <h3>Basic details</h3>
              </div>
              {editor.slug ? <Link className="btn tiny" to={`/courses/${editor.slug}`} target="_blank">Preview brochure</Link> : null}
            </div>
            <div className="builder-grid two-col">
              <label><span>Title</span><input value={editor.title} onChange={(event) => updateEditor((current) => ({ ...current, title: event.target.value }))} /></label>
              <label><span>Slug</span><input value={editor.slug} onChange={(event) => updateEditor((current) => ({ ...current, slug: event.target.value }))} /></label>
              <label><span>Category</span><input value={editor.category} onChange={(event) => updateEditor((current) => ({ ...current, category: event.target.value }))} /></label>
              <label><span>Level</span><input value={editor.level} onChange={(event) => updateEditor((current) => ({ ...current, level: event.target.value }))} /></label>
              <label><span>Status</span><select value={editor.status} onChange={(event) => updateEditor((current) => ({ ...current, status: event.target.value }))}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label>
              <label><span>Tagline</span><input value={editor.tagline} onChange={(event) => updateEditor((current) => ({ ...current, tagline: event.target.value }))} /></label>
              <label className="full"><span>Short description</span><textarea rows="3" value={editor.shortDescription} onChange={(event) => updateEditor((current) => ({ ...current, shortDescription: event.target.value }))} /></label>
            </div>
          </section>

          <section className="panel-card stack-form">
            <div className="panel-head compact">
              <div>
                <span className="eyebrow soft">BROCHURE</span>
                <h3>Marketing and brochure content</h3>
              </div>
            </div>
            <div className="builder-grid two-col">
              <label><span>Eyebrow</span><input value={editor.brochure.eyebrow} onChange={(event) => updateBrochure('eyebrow', event.target.value)} /></label>
              <label><span>Headline</span><input value={editor.brochure.headline} onChange={(event) => updateBrochure('headline', event.target.value)} /></label>
              <label className="full"><span>Lead</span><textarea rows="3" value={editor.brochure.lead} onChange={(event) => updateBrochure('lead', event.target.value)} /></label>
              <label><span>Brochure strap title</span><input value={editor.brochure.strapTitle} onChange={(event) => updateBrochure('strapTitle', event.target.value)} /></label>
              <label><span>Brochure strap text</span><input value={editor.brochure.strapText} onChange={(event) => updateBrochure('strapText', event.target.value)} /></label>
              <label><span>Brochure PDF URL</span><input value={editor.brochure.pdfUrl} onChange={(event) => updateBrochure('pdfUrl', event.target.value)} /></label>
              <label><span>Hero image URL</span><input value={editor.brochure.heroImageUrl} onChange={(event) => updateBrochure('heroImageUrl', event.target.value)} /></label>
              <div className="upload-pair">
                <AssetUploader folder="brochures" label="Brochure PDF" buttonText="Upload brochure" onUploaded={(asset) => updateBrochure('pdfUrl', asset.url)} />
                <AssetUploader folder="course-images" label="Hero image" buttonText="Upload image" onUploaded={(asset) => updateBrochure('heroImageUrl', asset.url)} />
              </div>
              <label><span>Chips (one per line)</span><textarea rows="4" value={listToText(editor.brochure.chips)} onChange={(event) => updateBrochure('chips', textToList(event.target.value))} /></label>
              <label><span>Audience (one per line)</span><textarea rows="4" value={listToText(editor.brochure.audience)} onChange={(event) => updateBrochure('audience', textToList(event.target.value))} /></label>
              <label><span>Outcomes (one per line)</span><textarea rows="4" value={listToText(editor.brochure.outcomes)} onChange={(event) => updateBrochure('outcomes', textToList(event.target.value))} /></label>
              <label><span>Differentiators (one per line)</span><textarea rows="4" value={listToText(editor.brochure.differentiators)} onChange={(event) => updateBrochure('differentiators', textToList(event.target.value))} /></label>
              <label className="full"><span>Cadence (one per line)</span><textarea rows="3" value={listToText(editor.brochure.cadence)} onChange={(event) => updateBrochure('cadence', textToList(event.target.value))} /></label>
              <label className="full"><span>Stats (Value | Label per line)</span><textarea rows="4" value={statsToText(editor.stats)} onChange={(event) => updateEditor((current) => ({ ...current, stats: textToStats(event.target.value) }))} /></label>
            </div>
          </section>

          <section className="panel-card stack-form">
            <div className="panel-head compact">
              <div>
                <span className="eyebrow soft">DOWNLOADS</span>
                <h3>Course-level downloads and materials</h3>
              </div>
            </div>
            <AttachmentEditor attachments={editor.downloads} uploadFolder="course-downloads" onChange={(downloads) => updateEditor((current) => ({ ...current, downloads }))} />
          </section>

          <section className="panel-card stack-form">
            <div className="panel-head compact">
              <div>
                <span className="eyebrow soft">CURRICULUM GRID</span>
                <h3>Weeks and day tracker blueprint</h3>
              </div>
              <button type="button" className="btn tiny primary" onClick={addWeek}><PlusCircle size={14} /> Add week</button>
            </div>

            <div className="week-editor-stack">
              {editor.weeks.map((week, weekIndex) => (
                <details className="builder-week-card" key={`${week.weekNumber}-${weekIndex}`} open>
                  <summary>
                    <div>
                      <strong>Week {week.weekNumber}: {week.title}</strong>
                      <span>{week.phaseLabel || 'Phase'} · {week.days.length} days</span>
                    </div>
                  </summary>
                  <div className="builder-grid two-col">
                    <label><span>Week title</span><input value={week.title} onChange={(event) => updateWeek(weekIndex, (current) => ({ ...current, title: event.target.value }))} /></label>
                    <label><span>Phase label</span><input value={week.phaseLabel || ''} onChange={(event) => updateWeek(weekIndex, (current) => ({ ...current, phaseLabel: event.target.value }))} /></label>
                    <label><span>Accent color</span><input value={week.accent || ''} onChange={(event) => updateWeek(weekIndex, (current) => ({ ...current, accent: event.target.value }))} /></label>
                    <label><span>Deliverables (comma-separated)</span><input value={(week.deliverables || []).join(', ')} onChange={(event) => updateWeek(weekIndex, (current) => ({ ...current, deliverables: textToList(event.target.value) }))} /></label>
                    <label className="full"><span>Week summary</span><textarea rows="3" value={week.summary || ''} onChange={(event) => updateWeek(weekIndex, (current) => ({ ...current, summary: event.target.value }))} /></label>
                  </div>
                  <div className="nested-actions">
                    <button type="button" className="btn tiny primary" onClick={() => addDay(weekIndex)}><PlusCircle size={14} /> Add day</button>
                    <button type="button" className="btn tiny danger-outline" onClick={() => removeWeek(weekIndex)}><Trash2 size={14} /> Remove week</button>
                  </div>
                  <div className="builder-day-stack">
                    {week.days.map((day, dayIndex) => (
                      <details className="builder-day-card" key={`${day.dayNumber}-${dayIndex}`}>
                        <summary>
                          <div>
                            <strong>Day {day.dayNumber}: {day.title}</strong>
                            <span>{day.dayType} · {day.hours}</span>
                          </div>
                        </summary>
                        <div className="builder-grid two-col">
                          <label><span>Day number</span><input type="number" value={day.dayNumber || 1} onChange={(event) => updateDay(weekIndex, dayIndex, (current) => ({ ...current, dayNumber: Number(event.target.value) }))} /></label>
                          <label><span>Day type</span><input value={day.dayType || ''} onChange={(event) => updateDay(weekIndex, dayIndex, (current) => ({ ...current, dayType: event.target.value }))} /></label>
                          <label><span>Hours</span><input value={day.hours || ''} onChange={(event) => updateDay(weekIndex, dayIndex, (current) => ({ ...current, hours: event.target.value }))} /></label>
                          <label><span>Title</span><input value={day.title || ''} onChange={(event) => updateDay(weekIndex, dayIndex, (current) => ({ ...current, title: event.target.value }))} /></label>
                          <label className="full"><span>Objective</span><textarea rows="3" value={day.objective || ''} onChange={(event) => updateDay(weekIndex, dayIndex, (current) => ({ ...current, objective: event.target.value }))} /></label>
                          <label className="full"><span>Primary deliverable</span><textarea rows="2" value={day.primaryDeliverable || ''} onChange={(event) => updateDay(weekIndex, dayIndex, (current) => ({ ...current, primaryDeliverable: event.target.value }))} /></label>
                          <label className="full"><span>Tags (comma-separated)</span><input value={tagsToText(day.tags)} onChange={(event) => updateDay(weekIndex, dayIndex, (current) => ({ ...current, tags: textToTags(event.target.value) }))} /></label>
                        </div>
                        <div className="builder-subsection">
                          <h4>Day sections</h4>
                          <SectionEditor sections={day.sections || []} onChange={(sections) => updateDay(weekIndex, dayIndex, (current) => ({ ...current, sections }))} />
                        </div>
                        <div className="builder-subsection">
                          <h4>Day materials</h4>
                          <AttachmentEditor attachments={day.materials || []} uploadFolder="day-materials" onChange={(materials) => updateDay(weekIndex, dayIndex, (current) => ({ ...current, materials }))} />
                        </div>
                        <div className="nested-actions">
                          <button type="button" className="btn tiny danger-outline" onClick={() => removeDay(weekIndex, dayIndex)}><Trash2 size={14} /> Remove day</button>
                        </div>
                      </details>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </section>

          <section className="panel-card stack-form">
            <div className="panel-head compact">
              <div>
                <span className="eyebrow soft">PREVIEW LINKS</span>
                <h3>Quick access</h3>
              </div>
            </div>
            <div className="deliverable-strip wrap">
              {editor.brochure?.heroImageUrl ? <a className="mini-badge material-badge" href={withApiOrigin(editor.brochure.heroImageUrl)} target="_blank" rel="noreferrer">Open hero image</a> : null}
              {editor.brochure?.pdfUrl ? <a className="mini-badge material-badge" href={withApiOrigin(editor.brochure.pdfUrl)} target="_blank" rel="noreferrer">Open brochure PDF</a> : null}
              {selectedCourse ? <Link className="mini-badge material-badge" to={`/portal/courses/${selectedCourse.slug}`} target="_blank">Open learner tracker</Link> : null}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
