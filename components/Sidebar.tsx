'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Calendar, ArrowRight, User } from 'lucide-react'
import { useTranslations } from '@/contexts/TranslationContext'
import { getLatestNews, getLatestBlogPosts } from '@/integrations/supabase/client'
import { getStoredSkills, categoryColors, type Skill } from '@/utils/skillsStorage'

interface SidebarProps {
  currentType: 'news' | 'blog'
  currentSlug?: string
}

export function Sidebar({ currentType, currentSlug }: SidebarProps) {
  const { t, currentLanguage } = useTranslations()
  const [news, setNews] = useState<any[]>([])
  const [blogs, setBlogs] = useState<any[]>([])
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const [newsData, blogData] = await Promise.all([
          getLatestNews(5),
          getLatestBlogPosts(5)
        ])
        setNews(newsData)
        setBlogs(blogData)
        setSkills(getStoredSkills())
      } catch (error) {
        console.error('Error loading sidebar data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const lang = currentLanguage.toLowerCase()
    return new Intl.DateTimeFormat(lang === 'ua' ? 'uk-UA' : lang === 'no' ? 'nb-NO' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date)
  }

  const getTitle = (item: any) => {
    const lang = currentLanguage.toLowerCase()
    return item[`title_${lang}`] || item.title_en || ''
  }

  const getSlug = (item: any) => {
    const lang = currentLanguage.toLowerCase()
    return item[`slug_${lang}`] || item.slug_en || item.id
  }

  // Filter out current article from related items
  const relatedItems = currentType === 'news'
    ? news.filter(item => getSlug(item) !== currentSlug).slice(0, 4)
    : blogs.filter(item => getSlug(item) !== currentSlug).slice(0, 4)

  const otherTypeItems = currentType === 'news'
    ? blogs.slice(0, 3)
    : news.slice(0, 3)

  return (
    <aside className="w-full lg:w-80 xl:w-96 flex-shrink-0">
      <div className="sticky top-8 space-y-6">
        {/* About Me Section */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Vitalii Berbeha</h3>
              <p className="text-sm text-gray-500">Marketing & Analytics Expert</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed mb-4">
            {currentLanguage === 'UA'
              ? 'Допомагаю організаціям зростати через дані, автоматизацію та AI. Творець Elvarika.'
              : currentLanguage === 'NO'
              ? 'Jeg hjelper organisasjoner med å vokse gjennom data, automatisering og AI. Skaper av Elvarika.'
              : 'I help organisations grow through data, automation, and AI. Creator of Elvarika.'}
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
          >
            {currentLanguage === 'UA' ? 'Дізнатись більше' : currentLanguage === 'NO' ? 'Les mer' : 'Learn more'}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Related Articles (same type) */}
        {relatedItems.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              {currentType === 'news' ? '📰' : '📝'}
              {currentType === 'news'
                ? (currentLanguage === 'UA' ? 'Більше новин' : currentLanguage === 'NO' ? 'Flere nyheter' : 'More News')
                : (currentLanguage === 'UA' ? 'Більше статей' : currentLanguage === 'NO' ? 'Flere artikler' : 'More Posts')}
            </h3>
            <div className="space-y-4">
              {relatedItems.map((item) => (
                <Link
                  key={item.id}
                  href={`/${currentType}/${getSlug(item)}`}
                  className="block group"
                >
                  <article className="flex gap-3">
                    {item.image_url && (
                      <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                        <img
                          src={item.image_url}
                          alt=""
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
                        {getTitle(item)}
                      </h4>
                      {item.published_at && (
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(item.published_at)}
                        </p>
                      )}
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Other Type Articles */}
        {otherTypeItems.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              {currentType === 'news' ? '📝' : '📰'}
              {currentType === 'news'
                ? (currentLanguage === 'UA' ? 'З блогу' : currentLanguage === 'NO' ? 'Fra bloggen' : 'From the Blog')
                : (currentLanguage === 'UA' ? 'З новин' : currentLanguage === 'NO' ? 'Fra nyhetene' : 'From the News')}
            </h3>
            <div className="space-y-3">
              {otherTypeItems.map((item) => (
                <Link
                  key={item.id}
                  href={`/${currentType === 'news' ? 'blog' : 'news'}/${getSlug(item)}`}
                  className="block group"
                >
                  <h4 className="text-sm text-gray-700 line-clamp-2 group-hover:text-blue-600 transition-colors">
                    {getTitle(item)}
                  </h4>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Skills Section */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            🏷️ {currentLanguage === 'UA' ? 'Навички' : currentLanguage === 'NO' ? 'Ferdigheter' : 'Skills'}
          </h3>
          <div className="flex flex-wrap gap-2">
            {skills.slice(0, 12).map((skill) => {
              const colors = categoryColors[skill.category]
              return (
                <span
                  key={skill.id}
                  className={`px-3 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}
                >
                  {skill.name}
                </span>
              )
            })}
          </div>
        </div>

        {/* Back to Home */}
        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors font-medium"
          >
            {currentLanguage === 'UA' ? '← На головну' : currentLanguage === 'NO' ? '← Til forsiden' : '← Back to Home'}
          </Link>
        </div>
      </div>
    </aside>
  )
}
