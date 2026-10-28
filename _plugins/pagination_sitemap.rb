# frozen_string_literal: true

module AfterPickup
  # jekyll-paginate-v2 names its generated homepage pages ".html", so Jekyll
  # does not see them as HTML pages and jekyll-sitemap leaves out the
  # homepage and /page/N/. Give them a proper index.html name before
  # rendering. Their URLs stay the same (/ and /page/N/).
  Jekyll::Hooks.register :site, :pre_render do |site|
    site.pages.each do |page|
      next unless page.class.name.end_with?("PaginationPage")
      next if page.html?

      page.instance_variable_set(:@name, "index.html")
      page.process("index.html")
      page.instance_variable_set(:@renderer, nil)
    end
  end
end
