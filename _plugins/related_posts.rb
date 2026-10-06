# frozen_string_literal: true

module Jekyll
  # Two or three posts from the same topic. If the topic has fewer than
  # two others, fill the rest with recent posts.
  module RelatedPostsFilter
    def related_posts(page, limit = 3)
      site = @context.registers[:site]
      return [] unless site && page

      limit = limit.to_i
      limit = 3 if limit <= 0
      url = page["url"].to_s
      tags = Array(page["tags"]).map(&:to_s)
      topic_tags = Array(site.data["topics"]).flat_map do |topic|
        topic.is_a?(Hash) ? Array(topic["tags"]).map(&:to_s) : []
      end
      mine = tags & topic_tags.uniq

      others = site.posts.docs.reject { |post| post.url == url }
      scored = others.map do |post|
        post_tags = Array(post.data["tags"]).map(&:to_s)
        [(post_tags & mine).length, post]
      end

      picked = scored
        .select { |score, _post| score.positive? }
        .sort_by { |score, post| [-score, -post.date.to_time.to_i] }
        .map(&:last)

      if picked.length < 2
        others.sort_by { |post| -post.date.to_time.to_i }.each do |post|
          break if picked.length >= limit

          picked << post unless picked.include?(post)
        end
      end

      picked.first(limit)
    end
  end
end

Liquid::Template.register_filter(Jekyll::RelatedPostsFilter)
