import { useEffect, useMemo, useRef, useState } from 'react';
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

const normalizeMaybeUrl = (value) => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  if (/^(https?:)?\/\//i.test(trimmed) || trimmed.startsWith('/')) return trimmed;
  return `https://${trimmed}`;
};

function makeAttachment() {
  return { id: `tmp-${Math.random().toString(36).slice(2, 9)}`, title: '', url: '', type: 'pdf', description: '' };
}

function makeResource(type = 'link') {
  const isVideo = type === 'video';
  return {
    id: `tmp-${Math.random().toString(36).slice(2, 9)}`,
    title: isVideo ? 'Video resource' : 'Material resource',
    url: '',
    type,
    description: isVideo ? 'Video walkthrough' : 'Reference material',
  };
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
        materials: (day.materials || [])
          .map((item) => ({
            ...item,
            type: item?.type || 'link',
            url: normalizeMaybeUrl(item.url),
          }))
          .filter((item) => item.url),
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

function DayResourceEditor({ resources = [], onChange }) {
  const safeResources = Array.isArray(resources) ? resources : [];

  const updateRow = (index, key, value) => {
    onChange(safeResources.map((item, rowIndex) => rowIndex === index ? { ...item, [key]: value } : item));
  };

  const addRow = (type = 'link') => {
    onChange([...safeResources, makeResource(type)]);
  };

  const removeRow = (index) => onChange(safeResources.filter((_, rowIndex) => rowIndex !== index));

  const handleAddResource = (event, type) => {
    event.preventDefault();
    event.stopPropagation();
    addRow(type);
  };

  const materialCount = safeResources.filter((item) => item.type !== 'video').length;
  const videoCount = safeResources.filter((item) => item.type === 'video').length;

  return (
    <div className="stack-rows day-resource-editor">
      <div className="resource-metrics-row">
        <span className="mini-badge">{materialCount} material links</span>
        <span className="mini-badge">{videoCount} video links</span>
      </div>

      {safeResources.map((item, index) => (
        <div className="resource-card-row" key={item.id || index}>
          <div className="resource-row">
            <select value={item.type || 'link'} onChange={(event) => updateRow(index, 'type', event.target.value)}>
              <option value="pdf">PDF</option>
              <option value="link">Reference link</option>
              <option value="video">Video</option>
              <option value="slides">Slides</option>
              <option value="repo">Repository</option>
              <option value="worksheet">Worksheet</option>
            </select>
            <input type="text" placeholder="Label (e.g. AWS VPC design notes)" value={item.title || ''} onChange={(event) => updateRow(index, 'title', event.target.value)} />
            <input
              type="text"
              placeholder="Video/Material URL (auto-adds https:// on save)"
              value={item.url || ''}
              onChange={(event) => updateRow(index, 'url', event.target.value)}
            />
          </div>
          <div className="resource-row-actions">
            <input type="text" placeholder="Short note" value={item.description || ''} onChange={(event) => updateRow(index, 'description', event.target.value)} />
            <AssetUploader
              label="Upload"
              folder="day-materials"
              buttonText="Upload"
              onUploaded={(asset) => onChange(safeResources.map((row, rowIndex) => rowIndex === index ? { ...row, url: asset.url, title: row.title || asset.name } : row))}
            />
            <button type="button" className="btn tiny danger-outline" onClick={() => removeRow(index)}><Trash2 size={14} /></button>
          </div>
        </div>
      ))}

      <div className="resource-actions-row">
        <button type="button" className="btn small" onClick={(event) => handleAddResource(event, 'link')}><PlusCircle size={16} /> Add material link</button>
        <button type="button" className="btn small" onClick={(event) => handleAddResource(event, 'video')}><PlusCircle size={16} /> Add video link</button>
      </div>
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
        <div className="section-row" key={`${section.label}-${index}`}>
          <input type="text" placeholder="Section label" value={section.label || ''} onChange={(event) => updateRow(index, 'label', event.target.value)} />
          <textarea rows="4" placeholder="Section content" value={section.value || ''} onChange={(event) => updateRow(index, 'value', event.target.value)} />
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
  const [autoSaving, setAutoSaving] = useState(false);
  const [autoSavedAt, setAutoSavedAt] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');
  const autoSaveTimerRef = useRef(null);
  const skipAutoSaveRef = useRef(true);

  const loadCourseTemplate = async () => {
    try {
      const { data } = await apiClient.get('/admin/courses/template');
      return cloneCourse(data);
    } catch {
      return makeCourse();
    }
  };

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
        skipAutoSaveRef.current = true;
        setIsDirty(false);
        setSelectedSlug(resolved);
        setEditingRef(resolved);
        setEditor(cloneCourse(selected));
        setSearchParams({ course: resolved });
      } else {
        const template = await loadCourseTemplate();
        skipAutoSaveRef.current = true;
        setIsDirty(false);
        setSelectedSlug('');
        setEditingRef('');
        setEditor(template);
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
    'courses:updated': () => {
      if (!isDirty && !saving && !autoSaving) {
        void loadCourses(selectedSlug);
      }
    },
  });

  const selectedCourse = useMemo(() => courses.find((course) => course.slug === selectedSlug) || null, [courses, selectedSlug]);

  const selectCourse = (course) => {
    skipAutoSaveRef.current = true;
    setIsDirty(false);
    setSelectedSlug(course.slug);
    setEditingRef(course.slug);
    setEditor(cloneCourse(course));
    setSearchParams({ course: course.slug });
    setFlash('');
  };

  const createNewCourse = () => {
    void (async () => {
      const fresh = await loadCourseTemplate();
      skipAutoSaveRef.current = true;
      setIsDirty(false);
      setSelectedSlug('');
      setEditingRef('');
      setEditor(fresh);
      setSearchParams({});
      setFlash('Creating a new course draft.');
    })();
  };

  const updateEditor = (updater) => {
    setIsDirty(true);
    setEditor((current) => typeof updater === 'function' ? updater(cloneCourse(current)) : updater);
  };
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
      setIsDirty(false);
      await loadCourses(saved.slug);
    } catch (saveError) {
      setError(saveError?.response?.data?.message || saveError.message || 'Failed to save course.');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (loading || !editingRef || !isDirty) return undefined;
    if (skipAutoSaveRef.current) {
      skipAutoSaveRef.current = false;
      return undefined;
    }

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    const snapshot = cloneCourse(editor);
    autoSaveTimerRef.current = setTimeout(async () => {
      setAutoSaving(true);
      try {
        const payload = normaliseEditorForSave(snapshot);
        const { data } = await apiClient.patch(`/admin/courses/${editingRef}`, payload);
        setCourses((current) => current.map((course) => course.slug === editingRef ? data : course));
        if (data?.slug && data.slug !== editingRef) {
          setEditingRef(data.slug);
          setSelectedSlug(data.slug);
          setSearchParams({ course: data.slug });
        }
        setAutoSavedAt(new Date().toLocaleTimeString());
        setIsDirty(false);
      } catch {
        setError('Autosave failed. Use Save course to persist changes.');
      } finally {
        setAutoSaving(false);
      }
    }, 900);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [editor, editingRef, isDirty, loading, setSearchParams]);

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
          {editingRef ? <span className="tiny-label">{autoSaving ? 'Saving changes...' : (autoSavedAt ? `Autosaved ${autoSavedAt}` : 'Autosave ready')}</span> : null}
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
                <p className="soft-text">Design each week as a blueprint and map every day with outcomes, sections, material links, and video references.</p>
              </div>
              <button type="button" className="btn tiny primary" onClick={addWeek}><PlusCircle size={14} /> Add week</button>
            </div>

            <div className="week-editor-stack">
              {editor.weeks.map((week, weekIndex) => (
                <details className="builder-week-card" key={`${week.weekNumber}-${weekIndex}`} open>
                  <summary>
                    <div className="builder-summary-copy">
                      <strong>Week {week.weekNumber}: {week.title}</strong>
                      <span>{week.phaseLabel || 'Phase'} · {week.days.length} days</span>
                    </div>
                    <div className="builder-summary-meta">
                      <span className="mini-badge">{(week.deliverables || []).length} deliverables</span>
                      <span className="mini-badge">{week.days.reduce((count, day) => count + (day.materials?.length || 0), 0)} resources</span>
                    </div>
                  </summary>
                  <div className="week-blueprint-shell">
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
                            <div className="builder-summary-copy">
                              <strong>Day {day.dayNumber}: {day.title}</strong>
                              <span>{day.dayType} · {day.hours}</span>
                            </div>
                            <div className="builder-summary-meta">
                              <span className="mini-badge">{day.sections?.length || 0} sections</span>
                              <span className="mini-badge">{day.materials?.length || 0} resources</span>
                            </div>
                          </summary>
                          <div className="day-blueprint-grid">
                            <div className="builder-grid two-col day-core-fields">
                              <label><span>Day number</span><input type="number" value={day.dayNumber || 1} onChange={(event) => updateDay(weekIndex, dayIndex, (current) => ({ ...current, dayNumber: Number(event.target.value) }))} /></label>
                              <label><span>Day type</span><input value={day.dayType || ''} onChange={(event) => updateDay(weekIndex, dayIndex, (current) => ({ ...current, dayType: event.target.value }))} /></label>
                              <label><span>Hours</span><input value={day.hours || ''} onChange={(event) => updateDay(weekIndex, dayIndex, (current) => ({ ...current, hours: event.target.value }))} /></label>
                              <label><span>Title</span><input value={day.title || ''} onChange={(event) => updateDay(weekIndex, dayIndex, (current) => ({ ...current, title: event.target.value }))} /></label>
                              <label className="full"><span>Objective</span><textarea rows="3" value={day.objective || ''} onChange={(event) => updateDay(weekIndex, dayIndex, (current) => ({ ...current, objective: event.target.value }))} /></label>
                              <label className="full"><span>Primary deliverable</span><textarea rows="2" value={day.primaryDeliverable || ''} onChange={(event) => updateDay(weekIndex, dayIndex, (current) => ({ ...current, primaryDeliverable: event.target.value }))} /></label>
                              <label className="full"><span>Tags (comma-separated)</span><input value={tagsToText(day.tags)} onChange={(event) => updateDay(weekIndex, dayIndex, (current) => ({ ...current, tags: textToTags(event.target.value) }))} /></label>
                            </div>
                          </div>
                          <div className="day-links-sections-grid">
                            <div className="builder-subsection day-sections-full">
                              <h4>Day sections</h4>
                              <SectionEditor sections={day.sections || []} onChange={(sections) => updateDay(weekIndex, dayIndex, (current) => ({ ...current, sections }))} />
                            </div>
                            <div className="builder-subsection day-resources-side">
                              <div className="section-head-actions">
                                <h4>Materials and videos</h4>
                                <div className="inline-action-cell">
                                  <button
                                    type="button"
                                    className="btn tiny"
                                    onClick={() => updateDay(weekIndex, dayIndex, (current) => ({
                                      ...current,
                                      materials: [...(current.materials || []), makeResource('link')],
                                    }))}
                                  >
                                    <PlusCircle size={14} /> Add material link
                                  </button>
                                  <button
                                    type="button"
                                    className="btn tiny"
                                    onClick={() => updateDay(weekIndex, dayIndex, (current) => ({
                                      ...current,
                                      materials: [...(current.materials || []), makeResource('video')],
                                    }))}
                                  >
                                    <PlusCircle size={14} /> Add video link
                                  </button>
                                </div>
                              </div>
                              <DayResourceEditor resources={day.materials || []} onChange={(materials) => updateDay(weekIndex, dayIndex, (current) => ({ ...current, materials }))} />
                            </div>
                          </div>
                          <div className="nested-actions">
                            <button type="button" className="btn tiny danger-outline" onClick={() => removeDay(weekIndex, dayIndex)}><Trash2 size={14} /> Remove day</button>
                          </div>
                        </details>
                      ))}
                    </div>
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
