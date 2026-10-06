# frozen_string_literal: true

module Jekyll
  # Guide front matter lists every post that belongs, including ones
  # still in _queue. Only slugs that already exist in site.posts render,
  # so a queued post shows up on its own once it is published.
  module GuideSectionsFilter
    def published_sections(sections)
      site = @context.registers[:site]
      return [] unless site

      by_slug = {}
      site.posts.docs.each do |post|
        by_slug[post.data["slug"].to_s] = post
      end

      Array(sections).filter_map do |section|
        next unless section.is_a?(Hash)

        post = by_slug[section["slug"].to_s]
        next unless post

        {
          "heading" => section["heading"].to_s,
          "text" => section["text"].to_s,
          "post" => post
        }
      end
    end

    def wrap_post(post)
      return [] if post.nil? || post == false

      [post]
    end
  end
end

Liquid::Template.register_filter(Jekyll::GuideSectionsFilter)
